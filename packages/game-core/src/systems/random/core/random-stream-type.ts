import { RANDOM_STREAM_TYPES } from "./random-config.ts";

export type RandomStreamType = (typeof RANDOM_STREAM_TYPES)[number];

export function isRandomStreamType(value: string): value is RandomStreamType {
  return RANDOM_STREAM_TYPES.some((streamType) => streamType === value);
}
