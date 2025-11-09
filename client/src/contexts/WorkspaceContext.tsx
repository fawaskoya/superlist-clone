import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Workspace } from '@shared/schema';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  switchWorkspace: (workspaceId: string) => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Namespace workspace ID by user to prevent cross-user contamination
  const getStorageKey = () => user?.id ? `currentWorkspaceId:${user.id}` : 'currentWorkspaceId';
  
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    user ? localStorage.getItem(getStorageKey()) : null
  );

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ['/api/workspaces'],
    enabled: !!user, // Only fetch when user is authenticated
  });

  const currentWorkspace = workspaces.find(w => w.id === selectedWorkspaceId) || workspaces[0] || null;

  // Clear old non-namespaced workspace ID on mount
  useEffect(() => {
    if (user) {
      localStorage.removeItem('currentWorkspaceId');
    }
  }, [user]);

  useEffect(() => {
    if (currentWorkspace && currentWorkspace.id !== selectedWorkspaceId && user) {
      setSelectedWorkspaceId(currentWorkspace.id);
      localStorage.setItem(getStorageKey(), currentWorkspace.id);
    }
  }, [currentWorkspace, selectedWorkspaceId, user]);

  const switchWorkspace = (workspaceId: string) => {
    if (!user) return;
    setSelectedWorkspaceId(workspaceId);
    localStorage.setItem(getStorageKey(), workspaceId);
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
