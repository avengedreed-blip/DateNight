import SplashScreen from "../screens/SplashScreen";
import StartScreen from "../screens/StartScreen.jsx";
import ModeSelectionScreen from "../screens/ModeSelectionScreen.jsx";
import GameScreen from "../screens/GameScreen.jsx";

export const APP_ROUTES = [
  {
    id: "splash",
    name: "Splash",
    Component: SplashScreen,
  },
  {
    id: "start",
    name: "Start",
    Component: StartScreen,
  },
  {
    id: "select",
    name: "Mode Selection",
    Component: ModeSelectionScreen,
  },
  {
    id: "game",
    name: "Game",
    Component: GameScreen,
  },
];

export const APP_ROUTE_MAP = APP_ROUTES.reduce((map, route) => {
  map[route.id] = route;
  return map;
}, {});

export const APP_ROUTE_IDS = APP_ROUTES.map((route) => route.id);
