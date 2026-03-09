const TOKEN_STORAGE_KEY = "dispatchlite_bearer_token";
const DEFAULT_DISPATCHER_TOKEN = "demo-dispatcher-token";

export const getBearerToken = (): string => {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    return DEFAULT_DISPATCHER_TOKEN;
  }
  return token;
};

export const setBearerToken = (token: string): void => {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
};
