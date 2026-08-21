export interface UserProfile {
  userId: string;
  name: string;
  goals: string[];
  habits: string[];
  preferences: {
    workStyle?: string;
    productivityPeaks?: string[];
    distractions?: string[];
  };
  personality?: {
    traits: string[];
    strengths: string[];
    weaknesses: string[];
  };
  behaviorPatterns: BehaviorPattern[];
  productivityScore: number;
  history: Interaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
}

export interface Interaction {
  timestamp: Date;
  type: 'chat' | 'simulation' | 'action' | 'activity';
  input: string;
  output: string;
  mode?: 'reflection' | 'simulation' | 'action';
}

export interface ChatRequest {
  userId: string;
  message: string;
  mode: 'reflection' | 'simulation' | 'action';
}

export interface ChatResponse {
  response: string;
  suggestions?: string[];
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  createdAt: Date;
}

export interface ActivityLog {
  userId: string;
  site: string;
  duration: number;
  timestamp: Date;
  productive: boolean;
}
