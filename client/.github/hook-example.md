```ts
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "@/shared/lib/api/axios";
import { queryKeys } from "@/shared/lib/react-query/query-keys.lib.ts";
import type {
	Paginated,
	Todo,
	TodoInput,
	TodoQueryParams,
	TodoUpdateInput,
} from "@/shared/types/todo";
import { centralTodoInvalidation } from "@/features/welcome/services/invalidations.onboarding";

// Service functions
export async function fetchTodos(
	params: TodoQueryParams = {}
): Promise<Paginated<Todo>> {
	const response = await axiosInstance.get<Paginated<Todo>>("/api/todos", {
		params,
	});
	return response.data;
}

export async function fetchTodo(id: string | number): Promise<Todo> {
	const response = await axiosInstance.get<Todo>(`/api/todos/${id}`);
	return response.data;
}

export async function createTodo(payload: TodoInput): Promise<Todo> {
	const response = await axiosInstance.post<Todo>("/api/todos", payload);
	return response.data;
}

export async function updateTodo({
	id,
	payload,
}: {
	id: string | number;
	payload: TodoUpdateInput;
}): Promise<Todo> {
	const response = await axiosInstance.put<Todo>(`/api/todos/${id}`, payload);
	return response.data;
}

export async function deleteTodo(
	id: string | number
): Promise<{ id: string | number }> {
	const response = await axiosInstance.delete<{ id: string | number }>(
		`/api/todos/${id}`
	);
	return response.data;
}

// Hooks
export function useTodos(params: TodoQueryParams = {}) {
	return useQuery({
		queryKey: queryKeys.todos.list(params),
		queryFn: () => fetchTodos(params),
		keepPreviousData: true,
	});
}

export function useInfiniteTodos(params: TodoQueryParams = {}) {
	return useInfiniteQuery({
		queryKey: queryKeys.todos.infinite(params),
		queryFn: async ({ pageParam = 1 }) =>
			fetchTodos({ ...params, page: pageParam }),
		getNextPageParam: (lastPage) => {
			const nextPage = lastPage.page + 1;
			return nextPage <= Math.ceil(lastPage.total / lastPage.pageSize)
				? nextPage
				: undefined;
		},
		refetchOnReconnect: true,
		refetchOnWindowFocus: true,
	});
}

export function useTodo(id: string | number | null) {
	return useQuery({
		enabled: Boolean(id),
		queryKey: queryKeys.todos.detail(id),
		queryFn: () => fetchTodo(id as string | number),
	});
}

export function useCreateTodo() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: createTodo,
		onMutate: async (newTodo) => {
			await client.cancelQueries({ queryKey: queryKeys.todos.all() });
			const previousList = client.getQueryData<Paginated<Todo>>(
				queryKeys.todos.list()
			);

			const optimisticTodo: Todo = {
				id: `temp-${Date.now()}`,
				completed: false,
				title: newTodo.title,
				description: newTodo.description,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			if (previousList) {
				client.setQueryData<Paginated<Todo>>(queryKeys.todos.list(), {
					...previousList,
					data: [optimisticTodo, ...previousList.data],
				});
			}

			return { previousList };
		},
		onError: (_error, _variables, context) => {
			if (context?.previousList) {
				client.setQueryData(queryKeys.todos.list(), context.previousList);
			}
		},
		onSuccess: (created) => {
			client.setQueryData<Paginated<Todo>>(
				queryKeys.todos.list(),
				(current) => {
					if (!current) return current;
					return {
						...current,
						data: [
							created,
							...current.data.filter(
								(item) => !String(item.id).startsWith("temp-")
							),
						],
					};
				}
			);
		},
		onSettled: () => centralTodoInvalidation("create"),
	});
}

export function useUpdateTodo(id: string | number) {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (payload: TodoUpdateInput) => updateTodo({ id, payload }),
		onMutate: async (payload) => {
			await Promise.all([
				client.cancelQueries({ queryKey: queryKeys.todos.detail(id) }),
				client.cancelQueries({ queryKey: queryKeys.todos.list() }),
			]);

			const previousDetail = client.getQueryData<Todo>(
				queryKeys.todos.detail(id)
			);
			const previousList = client.getQueryData<Paginated<Todo>>(
				queryKeys.todos.list()
			);

			if (previousDetail) {
				client.setQueryData<Todo>(queryKeys.todos.detail(id), {
					...previousDetail,
					...payload,
					updatedAt: new Date().toISOString(),
				});
			}

			if (previousList) {
				client.setQueryData<Paginated<Todo>>(queryKeys.todos.list(), {
					...previousList,
					data: previousList.data.map((todo) =>
						todo.id === id
							? { ...todo, ...payload, updatedAt: new Date().toISOString() }
							: todo
					),
				});
			}

			return { previousDetail, previousList };
		},
		onError: (_error, _variables, context) => {
			if (context?.previousDetail) {
				client.setQueryData(queryKeys.todos.detail(id), context.previousDetail);
			}
			if (context?.previousList) {
				client.setQueryData(queryKeys.todos.list(), context.previousList);
			}
		},
		onSettled: () => centralTodoInvalidation("update", id),
	});
}

export function useDeleteTodo(id: string | number) {
	const client = useQueryClient();

	return useMutation({
		mutationFn: () => deleteTodo(id),
		onMutate: async () => {
			await Promise.all([
				client.cancelQueries({ queryKey: queryKeys.todos.detail(id) }),
				client.cancelQueries({ queryKey: queryKeys.todos.list() }),
			]);

			const previousDetail = client.getQueryData<Todo>(
				queryKeys.todos.detail(id)
			);
			const previousList = client.getQueryData<Paginated<Todo>>(
				queryKeys.todos.list()
			);

			if (previousList) {
				client.setQueryData<Paginated<Todo>>(queryKeys.todos.list(), {
					...previousList,
					data: previousList.data.filter((todo) => todo.id !== id),
				});
			}

			return { previousDetail, previousList };
		},
		onError: (_error, _variables, context) => {
			if (context?.previousDetail) {
				client.setQueryData(queryKeys.todos.detail(id), context.previousDetail);
			}
			if (context?.previousList) {
				client.setQueryData(queryKeys.todos.list(), context.previousList);
			}
		},
		onSettled: () => centralTodoInvalidation("delete", id),
	});
}
```
