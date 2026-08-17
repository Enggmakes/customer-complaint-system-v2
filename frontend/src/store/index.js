import { configureStore } from '@reduxjs/toolkit';
import complaintsReducer from './complaintsSlice';
import chatReducer from './chatSlice';
import uiReducer from './uiSlice';
import workspaceReducer from './workspaceSlice';

export const store = configureStore({
  reducer: {
    workspace: workspaceReducer,
    complaints: complaintsReducer,
    chat: chatReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export default store;
