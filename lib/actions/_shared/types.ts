// Every Server Action in this app returns this exact shape.
// UI code should always check result.success before reading .data or .error.
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code: string; fieldErrors?: Record<string, string[] | undefined> } };
