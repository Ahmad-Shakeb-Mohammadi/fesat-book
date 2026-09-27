export const appState = {
    user: null,
    csrfToken: null,
    upCursor: {
        createdAt: null,
        postId: null,
        mode: 'newFollowing'
    },
    downCursor: {
        createdAt: null,
        postId: null,
        mode: 'oldFollowing'
    },
    suggestedCursor: {
        createdAt: null,
        postId: null
    },
    myPostsCursor: {
        createdAt: null,
        postId: null
    },
    userPostsCursor: {
        userId: null,
        createdAt: null,
        postId: null
    },
    likeCursor: null,
    commentCursor: null,
    peopleCursor: {
        createdAt: null,
        _id: null
    },
    activeUploads: {
        postCreation: { isUploading: false, progress: 0, abortController: null, listeners: [] },
        postEditing: { isUploading: false, progress: 0, abortController: null, postId: null, listeners: [] }
    }
}