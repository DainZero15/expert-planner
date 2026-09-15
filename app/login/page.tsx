import Link from "next/link";
import { LoginForm } from "./login-form";
export default function LoginPage() { return <main className="shell"><header className="topbar"><Link className="brand" href="/">Expert <span>Planner</span></Link></header><div style={{ maxWidth: 440, margin: "40px auto" }}><LoginForm /></div></main>; }
