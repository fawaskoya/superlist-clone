import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Workspace } from '@shared/schema';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  switchWorkspace: (workspaceId: string) => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    localStorage.getItem('currentWorkspaceId')
  );

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ['/api/workspaces'],
  });

  const currentWorkspace = workspaces.find(w => w.id === selectedWorkspaceId) || workspaces[0] || null;

  useEffect(() => {
    if (currentWorkspace && currentWorkspace.id !== selectedWorkspaceId) {
      setSelectedWorkspaceId(currentWorkspace.id);
      localStorage.setItem('currentWorkspaceId', currentWorkspace.id);
    }
  }, [currentWorkspace, selectedWorkspaceId]);

  const switchWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    localStorage.setItem('currentWorkspaceId', workspaceId);
  };

  return (
    <WorkspaceContext.Provider
      value={{ currentWorkspace, workspaces, switchWorkspace, isLoading }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
