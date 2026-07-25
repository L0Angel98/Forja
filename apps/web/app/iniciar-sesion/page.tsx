import { FormularioLogin } from "../../components/formulario-login";
import estilos from "../../components/formulario-login.module.css";

export default function PaginaIniciarSesion() {
  return (
    <main className={estilos.pantalla}>
      <div>
        <h1 className={estilos.titulo}>Forja</h1>
        <FormularioLogin />
      </div>
    </main>
  );
}
