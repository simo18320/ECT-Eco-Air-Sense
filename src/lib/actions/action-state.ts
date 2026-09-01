export type ActionState = {
  error: string | null;
  success: boolean;
};

export const ACTION_INITIAL_STATE: ActionState = { error: null, success: false };
