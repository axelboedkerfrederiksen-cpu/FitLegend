export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Exercise {
  id: number
  name: string
  muscle_group: 'Push' | 'Pull' | 'Legs' | 'Core' | 'Cardio'
  icon: string
}

export interface Workout {
  id: string
  user_id: string
  created_at: string
  notes: string | null
  duration_minutes: number | null
}

export interface WorkoutSet {
  id: string
  workout_id: string
  exercise_id: number
  exercise_name: string
  sets: number
  reps: number
  weight_kg: number
  created_at: string
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface PersonalRecord {
  id: string
  user_id: string
  exercise_name: string
  weight_kg: number
  reps: number
  achieved_at: string
}

export interface WorkoutWithSets extends Workout {
  workout_sets: WorkoutSet[]
}

export interface FeedWorkout extends WorkoutWithSets {
  profiles: Profile
}
