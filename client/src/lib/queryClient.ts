import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Don't redirect if we're on an invitation page - let it handle the error
    const isInvitationPage = window.location.pathname.startsWith('/invite/');
    
    // Clone the response so we can read it without consuming it
    const clonedRes = res.clone();
    
    // Try to parse JSON error message
    let errorMessage = res.statusText;
    try {
      const text = await clonedRes.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch {
      // If we can't read the response, use statusText
      errorMessage = res.statusText;
    }
    
    if ((res.status === 401 || res.status === 403) && !isInvitationPage) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    throw error;
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Build URL from query key - handle both string arrays and mixed types
    let pathParts: string[] = [];
    let queryParams: Record<string, string> = {};

    queryKey.forEach((part, index) => {
      if (part === null || part === undefined) return;

      if (typeof part === 'object') {
        // This is a query parameters object
        queryParams = { ...queryParams, ...part };
      } else {
        // This is a path part
        pathParts.push(String(part));
      }
    });

    let url = pathParts
      .join("/")
      .replace(/\/+/g, "/") // Remove duplicate slashes
      .replace(/^\/+/, "/"); // Ensure it starts with /

    // Add query parameters if any
    if (Object.keys(queryParams).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 1, // Retry once on failure
      retryDelay: 1000, // Wait 1 second before retry
    },
    mutations: {
      retry: false,
    },
  },
});
