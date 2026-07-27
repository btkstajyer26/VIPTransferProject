import AppRoutes from "./routes/AppRoutes";
import PushNotificationPrompt from "./components/notifications/PushNotificationPrompt";

function App() {
  return (
    <>
      <AppRoutes />
      <PushNotificationPrompt />
    </>
  );
}

export default App;
