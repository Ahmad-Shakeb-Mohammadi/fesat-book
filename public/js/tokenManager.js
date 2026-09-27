let accessToken = null;

export const tokenManager = {
    get: () => accessToken,
    set: (token) => accessToken = token,
    clear: () => accessToken = null,
    isAuth: () => accessToken !== null
}