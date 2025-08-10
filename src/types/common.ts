/**
 * Utility type that makes all properties of T required instead of partial
 * This is the opposite of Partial<T>
 */
export type NotPartial<T> = {
  [P in keyof T]-?: T[P];
};
