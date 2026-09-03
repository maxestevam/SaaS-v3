/** Loja Descomplicada: a raiz direciona a pessoa à jornada certa de acesso ou painel. */
import { Redirect } from "wouter";

export default function Home() {
  return <Redirect to={localStorage.getItem("ld_token") ? "/dashboard" : "/login"} />;
}
