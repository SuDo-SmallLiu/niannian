import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  requireAuth,
  AuthError,
  unauthorizedResponse,
  type AuthUser,
} from '@/lib/auth';
import { getFamily, getPhoto, getStory, getLifeMovie, isFamilyMember } from '@/lib/db';

export class FamilyAccessError extends Error {
  constructor(message = '无权访问该家庭记忆') {
    super(message);
    this.name = 'FamilyAccessError';
  }
}

export class FamilyNotFoundError extends Error {
  constructor(message = '家庭不存在') {
    super(message);
    this.name = 'FamilyNotFoundError';
  }
}

export async function requireFamilyAccess(
  request: NextRequest,
  familyId: string
): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (!getFamily(familyId)) {
    throw new FamilyNotFoundError();
  }
  if (!isFamilyMember(familyId, user.id)) {
    throw new FamilyAccessError();
  }
  return user;
}

export async function requirePhotoAccess(
  request: NextRequest,
  photoId: string
): Promise<AuthUser> {
  const photo = getPhoto(photoId);
  if (!photo) {
    throw new FamilyNotFoundError('照片不存在');
  }
  return requireFamilyAccess(request, photo.family_id);
}

export async function requireStoryAccess(
  request: NextRequest,
  storyId: string
): Promise<AuthUser> {
  const story = getStory(storyId);
  if (!story) {
    throw new FamilyNotFoundError('故事不存在');
  }
  return requireFamilyAccess(request, story.family_id);
}

export async function requireMovieAccess(
  request: NextRequest,
  movieId: string
): Promise<AuthUser> {
  const movie = getLifeMovie(movieId);
  if (!movie) {
    throw new FamilyNotFoundError('人生电影不存在');
  }
  return requireFamilyAccess(request, movie.family_id);
}

export function familyAccessErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return unauthorizedResponse();
  }
  if (error instanceof FamilyNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof FamilyAccessError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}
