/** SQLite row shapes — used by db.ts query parsers */

export interface FamilyRow {
  id: string;
  name: string;
  members: string;
  created_at: string;
  [key: string]: unknown;
}

export interface PhotoRow {
  id: string;
  family_id: string;
  url: string;
  taken_at?: string | null;
  location?: string | null;
  people?: string | null;
  event?: string | null;
  source_type?: string | null;
  source_metadata?: string | null;
  analysis_status?: string | null;
  [key: string]: unknown;
}

export interface StoryRow {
  id: string;
  family_id: string;
  title: string;
  description?: string | null;
  summary?: string | null;
  theme?: string | null;
  connection_action?: string | null;
  timeline?: string | null;
  photos?: string | null;
  published?: number | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface UserRow {
  id: string;
  phone: string;
  name?: string | null;
  avatar?: string | null;
  [key: string]: unknown;
}

export interface VerifyCodeRow {
  id: number;
  phone: string;
  code: string;
  used: number;
  expires_at: string;
  [key: string]: unknown;
}

export interface MemoryCardRow {
  id: string;
  photo_id: string;
  family_id: string;
  people?: string | null;
  location?: string | null;
  taken_at?: string | null;
  action?: string | null;
  significance?: string | null;
  understanding?: string | null;
  change_detail?: string | null;
  user_notes?: string | null;
  voice_transcript?: string | null;
  ai_questions?: string | null;
  [key: string]: unknown;
}

export interface LifeMovieRow {
  id: string;
  family_id: string;
  title: string;
  summary?: string | null;
  media_url?: string | null;
  render_status?: string | null;
  render_error?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface InvitationRow {
  id: string;
  family_id: string;
  code: string;
  used_by?: string | null;
  expires_at?: string | null;
  [key: string]: unknown;
}

export interface FamilyMemberRow {
  family_id: string;
  user_id: string;
  role: string;
  [key: string]: unknown;
}

export interface ShareJoinRow {
  story_id?: string;
  movie_id?: string;
  photo_id?: string;
  family_name?: string;
  story_title?: string;
  story_description?: string;
  story_summary?: string;
  story_photos?: string;
  story_timeline?: string;
  connection_action?: string;
  family_id?: string;
  [key: string]: unknown;
}
