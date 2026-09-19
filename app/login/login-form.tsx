"use client";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
const initialState: LoginState = {};
export function LoginForm() { const [state, action, pending] = useActionState(login, initialState); return <form action={action} className="card login-card"><div className="login-mark">EP</div><div className="eyebrow">Expert Planner</div><h2>Fijn dat u er bent.</h2><p className="muted">Gebruik uw eigen account om verder te gaan.</p><label>E-mailadres<input required name="email" type="email" autoComplete="email" placeholder="naam@bedrijf.nl" /></label><label>Wachtwoord<input required name="password" type="password" autoComplete="current-password" placeholder="Uw wachtwoord" /></label>{state.error && <p className="error" role="alert">{state.error}</p>}<button className="login-submit" disabled={pending}>{pending ? "Inloggen…" : "Inloggen →"}</button><p className="login-help">Problemen met inloggen? Neem contact op met uw planner.</p></form>; }
