import { FormField } from "./FormField.jsx";

export function PasswordField(props) {
  return <FormField type="password" autoComplete="current-password" {...props} />;
}
