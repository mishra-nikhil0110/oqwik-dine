// store/store.ts - central integration. All slices registered here.

import { configureStore } from "@reduxjs/toolkit";
import sessionReducer from "./slices/sessionSlice";
import tableReducer from "./slices/tableSlice";
import cartReducer from "./slices/cartSlice";
import ordersReducer from "./slices/ordersSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      session: sessionReducer,
      table: tableReducer,
      cart: cartReducer,
      orders: ordersReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
