// Root page - this should never be reached because middleware handles the redirect
// But if it is, just return null to let middleware handle it
export default function RootPage() {
  return null;
}

