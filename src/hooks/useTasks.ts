import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { TaskInsert, TaskUpdate } from "@/lib/types";
import { pyroFeed, consumePyroSourceRect } from "./usePyro";

export const useTasks = (projectId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Run the daily auto-reset only once per session (not on every query refetch).
  const dailyResetDone = useRef(false);
  useEffect(() => {
    if (!user || dailyResetDone.current) return;
    dailyResetDone.current = true;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    supabase
      .from("tasks")
      .update({ status: "todo", completed_at: null, xp_awarded: false })
      .eq("user_id", user.id)
      .eq("is_daily", true)
      .eq("status", "done")
      .lt("completed_at", todayStart.toISOString())
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["daily-tasks"] });
      });
  }, [user, queryClient]);

  const tasksQuery = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*")
        .is("parent_task_id", null)
        .eq("is_daily", false)
        .not("tags", "cs", '{tipo:horario}')
        .order("position", { ascending: true });
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const dailyTasksQuery = useQuery({
    queryKey: ["daily-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .is("parent_task_id", null)
        .eq("is_daily", true)
        .not("tags", "cs", '{tipo:horario}')
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const subtasksQuery = useQuery({
    queryKey: ["subtasks", projectId],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*")
        .not("parent_task_id", "is", null)
        .not("tags", "cs", '{tipo:horario}')
        .order("position", { ascending: true });
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const allTasksQuery = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .not("tags", "cs", '{tipo:horario}')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (task: Omit<TaskInsert, "user_id">) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...task, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["daily-tasks"] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      if (vars.status === "done") {
        const taskId = typeof data?.id === "string" ? data.id : vars.id;
        pyroFeed({
          taskId,
          taskTitle: typeof data?.title === "string" ? data.title : undefined,
          sourceRect: taskId ? consumePyroSourceRect(taskId) : undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["daily-tasks"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["daily-tasks"] });
    },
  });

  return {
    tasks: tasksQuery.data ?? [],
    dailyTasks: dailyTasksQuery.data ?? [],
    subtasks: subtasksQuery.data ?? [],
    allTasks: allTasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    createTask,
    updateTask,
    deleteTask,
  };
};
