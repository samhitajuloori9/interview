import { Task, TaskPriority, TaskStatus } from '../types/task';
import { addDays, addMonths, addWeeks, format, parseISO, startOfDay, startOfMonth, startOfWeek } from 'date-fns';

export type TimeInterval = 'daily' | 'weekly' | 'monthly';

interface CompletionRateData {
  date: string;
  completed: number;
  total: number;
  completionRate: number;
}

interface AvgCompletionTimeData {
  group: string;
  avgCompletionTimeHours: number;
  count: number;
}

interface TopTag {
  tag: string;
  count: number;
  completionRate: number;
}

export const calculateCompletionRates = (
  tasks: Task[],
  interval: TimeInterval = 'daily',
  from?: Date,
  to?: Date
): CompletionRateData[] => {
  const now = new Date();
  const startDate = from || (() => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1); // Default to last month
    return d;
  })();
  const endDate = to || now;

  const dateBuckets: { [key: string]: { completed: number; total: number } } = {};
  
  // Initialize date buckets based on interval
  let current = new Date(startDate);
  while (current <= endDate) {
    let key: string;
    let nextDate: Date;
    
    switch (interval) {
      case 'daily':
        key = format(startOfDay(current), 'yyyy-MM-dd');
        nextDate = addDays(current, 1);
        break;
      case 'weekly':
        key = format(startOfWeek(current, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        nextDate = addWeeks(current, 1);
        break;
      case 'monthly':
        key = format(startOfMonth(current), 'yyyy-MM');
        nextDate = addMonths(current, 1);
        break;
    }
    
    dateBuckets[key] = { completed: 0, total: 0 };
    current = nextDate;
  }

  // Process tasks into date buckets
  tasks.forEach(task => {
    if (!task.completedAt) return;
    
    const completedAt = typeof task.completedAt === 'string' 
      ? parseISO(task.completedAt) 
      : task.completedAt;
    
    if (completedAt < startDate || completedAt > endDate) return;
    
    let key: string;
    switch (interval) {
      case 'daily':
        key = format(startOfDay(completedAt), 'yyyy-MM-dd');
        break;
      case 'weekly':
        key = format(startOfWeek(completedAt, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'monthly':
        key = format(startOfMonth(completedAt), 'yyyy-MM');
        break;
    }
    
    if (dateBuckets[key]) {
      dateBuckets[key].completed++;
    }
  });

  // Count all tasks created before or during each bucket period
  tasks.forEach(task => {
    const createdAt = typeof task.createdAt === 'string' 
      ? parseISO(task.createdAt) 
      : task.createdAt;
    
    if (createdAt > endDate) return;
    
    Object.entries(dateBuckets).forEach(([key, bucket]) => {
      const bucketDate = new Date(key);
      if (createdAt <= bucketDate) {
        bucket.total++;
      }
    });
  });

  // Convert to array and calculate rates
  return Object.entries(dateBuckets)
    .map(([date, { completed, total }]) => ({
      date,
      completed,
      total,
      completionRate: total > 0 ? parseFloat((completed / total * 100).toFixed(2)) : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const calculateAverageCompletionTime = (
  tasks: Task[],
  groupBy: 'priority' | 'overall' = 'overall'
): { data: AvgCompletionTimeData[]; groupBy: string } => {
  const completedTasks = tasks.filter(
    task => task.status === TaskStatus.COMPLETED && task.completedAt && task.createdAt
  );

  if (groupBy === 'overall') {
    const totalTime = completedTasks.reduce((sum, task) => {
      const completedAt = new Date(task.completedAt!).getTime();
      const createdAt = new Date(task.createdAt!).getTime();
      return sum + Math.max(0, completedAt - createdAt);
    }, 0);

    const avgHours = completedTasks.length > 0 
      ? totalTime / (completedTasks.length * 3600000)
      : 0;

    return {
      data: [{
        group: 'overall',
        avgCompletionTimeHours: avgHours,
        count: completedTasks.length
      }],
      groupBy: 'overall'
    };
  }

  // Group by priority
  const priorityGroups: Record<string, { totalTime: number; count: number }> = {
    [TaskPriority.LOW]: { totalTime: 0, count: 0 },
    [TaskPriority.MEDIUM]: { totalTime: 0, count: 0 },
    [TaskPriority.HIGH]: { totalTime: 0, count: 0 }
  };
  
  completedTasks.forEach(task => {
    const priority = task.priority;
    const completedAt = new Date(task.completedAt!).getTime();
    const createdAt = new Date(task.createdAt!).getTime();
    const duration = Math.max(0, completedAt - createdAt);
    
    if (priority in priorityGroups) {
      priorityGroups[priority].totalTime += duration;
      priorityGroups[priority].count++;
    }
  });

  const result = Object.entries(priorityGroups).map(([priority, { totalTime, count }]) => ({
    group: priority,
    avgCompletionTimeHours: count > 0 ? totalTime / (count * 3600000) : 0,
    count
  }));

  return {
    data: result,
    groupBy: 'priority'
  };
};

export const getTopTags = (tasks: Task[], limit: number = 10): TopTag[] => {
  const tagStats: { 
    [tag: string]: { count: number; completed: number } 
  } = {};

  // Count tag occurrences and completions
  tasks.forEach(task => {
    task.tags?.forEach(tag => {
      if (!tagStats[tag]) {
        tagStats[tag] = { count: 0, completed: 0 };
      }
      tagStats[tag].count++;
      if (task.status === TaskStatus.COMPLETED) {
        tagStats[tag].completed++;
      }
    });
  });

  // Convert to array and calculate completion rates
  return Object.entries(tagStats)
    .map(([tag, { count, completed }]) => ({
      tag,
      count,
      completionRate: parseFloat(((completed / count) * 100).toFixed(2))
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};
