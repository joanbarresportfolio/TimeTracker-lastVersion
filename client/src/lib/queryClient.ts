import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        const text = await res.text();
        if (text) errorMessage = text;
      }
    } catch (e) {
      // Si no se puede parsear, usar el statusText
    }
    
    // Proporcionar mensajes más descriptivos según el código de estado
    const statusMessages: Record<number, string> = {
      400: 'Datos inválidos',
      401: 'No autorizado. Por favor, inicia sesión nuevamente',
      403: 'No tienes permisos para realizar esta acción',
      404: 'Recurso no encontrado',
      409: 'Conflicto con el estado actual',
      422: 'Datos no válidos para procesar',
      500: 'Error del servidor. Inténtalo de nuevo más tarde',
      503: 'Servicio no disponible temporalmente',
    };
    
    const defaultMessage = statusMessages[res.status] || `Error ${res.status}`;
    
    // Si el mensaje del servidor no contiene información útil, usar el mensaje por defecto
    if (!errorMessage || errorMessage === res.statusText || errorMessage.length < 3) {
      errorMessage = defaultMessage;
    } else if (!errorMessage.includes(res.status.toString())) {
      // Combinar el mensaje del servidor con el contexto del código de estado
      errorMessage = `${defaultMessage}: ${errorMessage}`;
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
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
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
