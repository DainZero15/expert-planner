"use client";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
const initialState: LoginState = {};
export function LoginForm() { const [state, action, pending] = useActionState(login, initialState); return <form action={action} className="card"><h1>Inloggen</h1><p className="muted">Gebruik uw Expert Planner-account.</p><label>E-mailadres<input required name="email" type="email" autoComplete="email" /></label><label>Wachtwoord<input required name="password" type="password" autoComplete="current-password" /></label>{state.error && <p className="error" role="alert">{state.error}</p>}<button disabled={pending}>{pending ? "Bezig…" : "Inloggen"}</button></form>; }
