import PropTypes from "prop-types";
import { ArrowLeft, Mail } from "lucide-react";
import { BrandMark, BrandWordmark } from "../components/brand/BrandIdentity";
import "./LegalPage.css";

const LAST_UPDATED = "6 de septiembre de 2026";
const SUPPORT_EMAIL = "admin@rirfit.com";

const privacySections = [
  {
    title: "1. Qué información tratamos",
    content: (
      <>
        <p>RIRFIT puede tratar las siguientes categorías de información:</p>
        <ul>
          <li>
            <strong>Cuenta e identidad:</strong> nombre mostrado, nombre de
            usuario, correo electrónico, rol y estado de la cuenta.
          </li>
          <li>
            <strong>Acceso mediante terceros:</strong> identificador de Google o
            Facebook y los datos básicos que autorices, como nombre, correo y
            foto de perfil. No recibimos la contraseña de esas plataformas.
          </li>
          <li>
            <strong>Perfil deportivo:</strong> fecha de nacimiento, peso,
            altura, objetivo, experiencia, frecuencia, unidades e idioma.
          </li>
          <li>
            <strong>Actividad física:</strong> rutinas, ejercicios, series,
            repeticiones, cargas, RIR, sesiones, marcas, pesajes, check-ins y
            métricas de progreso.
          </li>
          <li>
            <strong>Contenido:</strong> fotografías y otros archivos que decidas
            subir.
          </li>
          <li>
            <strong>Datos técnicos y de seguridad:</strong> dirección IP,
            navegador, dispositivo, sistema operativo, sesiones activas y
            registros necesarios para proteger el servicio.
          </li>
          <li>
            <strong>Preferencias:</strong> configuración, notificaciones y tu
            elección de recibir novedades por correo.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "2. Cómo obtenemos la información",
    content: (
      <p>
        La obtenemos cuando creas o completas tu cuenta, registras un
        entrenamiento, subes contenido, utilizas la aplicación, te comunicas con
        soporte o eliges iniciar sesión con Google o Facebook.
      </p>
    ),
  },
  {
    title: "3. Para qué la utilizamos",
    content: (
      <ul>
        <li>Crear, autenticar y proteger tu cuenta.</li>
        <li>Registrar y mostrar tu entrenamiento y evolución.</li>
        <li>Personalizar rutinas, métricas y experiencia de uso.</li>
        <li>
          Permitir la relación entre atleta y entrenador cuando corresponda.
        </li>
        <li>Enviar mensajes operativos y, solo si lo aceptas, novedades.</li>
        <li>Prevenir abuso, resolver errores y mejorar el servicio.</li>
        <li>Cumplir obligaciones legales y atender solicitudes válidas.</li>
      </ul>
    ),
  },
  {
    title: "4. Proveedores y transferencias",
    content: (
      <p>
        Para operar RIRFIT podemos usar proveedores de alojamiento,
        almacenamiento de base de datos, entrega de imágenes y correo. También
        intervienen Google o Meta cuando eliges su inicio de sesión. Estos
        proveedores reciben únicamente la información necesaria para prestar su
        servicio y pueden procesarla en otros países conforme a sus propias
        condiciones y medidas de protección.
      </p>
    ),
  },
  {
    title: "5. Conservación y seguridad",
    content: (
      <p>
        Conservamos la información mientras tu cuenta esté activa y durante el
        tiempo razonablemente necesario para prestar el servicio, protegerlo y
        cumplir obligaciones aplicables. Usamos controles técnicos y
        organizativos para reducir accesos no autorizados, aunque ningún sistema
        conectado a Internet puede garantizar seguridad absoluta.
      </p>
    ),
  },
  {
    title: "6. Tus decisiones y derechos",
    content: (
      <p>
        Puedes corregir diversos datos desde tu perfil, retirar el permiso de
        Google o Facebook desde esas plataformas, dejar de recibir novedades y
        solicitar acceso, corrección o eliminación de tu información. Para
        eliminar tu cuenta y sus datos, sigue nuestras{` `}
        <a href="/eliminar-cuenta">instrucciones de eliminación</a>.
      </p>
    ),
  },
  {
    title: "7. Menores de edad",
    content: (
      <p>
        RIRFIT no está dirigido a menores de 13 años. Si crees que un menor nos
        proporcionó información sin la autorización necesaria, escríbenos para
        revisarla y eliminarla cuando corresponda.
      </p>
    ),
  },
  {
    title: "8. Cambios y contacto",
    content: (
      <p>
        Podemos actualizar esta política para reflejar cambios del producto o
        legales. Publicaremos aquí la versión vigente y su fecha. Para consultas
        de privacidad, escribe a{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    ),
  },
];

const termsSections = [
  {
    title: "1. Aceptación y cuenta",
    content: (
      <p>
        Al crear una cuenta o usar RIRFIT aceptas estos términos. Debes aportar
        información correcta, mantener seguras tus credenciales y avisarnos si
        detectas un acceso no autorizado. Eres responsable de la actividad
        realizada desde tu cuenta.
      </p>
    ),
  },
  {
    title: "2. Qué ofrece RIRFIT",
    content: (
      <p>
        RIRFIT permite planificar y registrar entrenamientos, analizar progreso,
        administrar rutinas y, cuando se habilita, conectar atletas con
        entrenadores. Podemos mejorar, sustituir o retirar funciones procurando
        no afectar injustificadamente el acceso al servicio.
      </p>
    ),
  },
  {
    title: "3. Salud y entrenamiento",
    content: (
      <p>
        La información y las estimaciones de RIRFIT tienen fines informativos y
        de organización deportiva. No constituyen diagnóstico, tratamiento ni
        consejo médico. Consulta a un profesional calificado antes de comenzar o
        modificar un programa, especialmente si tienes lesiones, síntomas o una
        condición de salud. Detén la actividad ante dolor o malestar.
      </p>
    ),
  },
  {
    title: "4. Uso permitido",
    content: (
      <>
        <p>No puedes usar RIRFIT para:</p>
        <ul>
          <li>Infringir leyes, derechos de terceros o medidas de seguridad.</li>
          <li>Acceder a cuentas o datos sin autorización.</li>
          <li>
            Introducir código malicioso, automatizar abuso o interrumpir el
            servicio.
          </li>
          <li>
            Publicar contenido ilícito, engañoso o que no tengas derecho a usar.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Tu contenido",
    content: (
      <p>
        Conservas los derechos sobre el contenido que aportas. Nos autorizas a
        alojarlo, procesarlo y mostrarlo únicamente en la medida necesaria para
        operar las funciones que solicitas. Eres responsable de contar con los
        permisos necesarios sobre ese contenido.
      </p>
    ),
  },
  {
    title: "6. Disponibilidad y responsabilidad",
    content: (
      <p>
        Trabajamos para mantener un servicio seguro y disponible, pero puede
        haber interrupciones, mantenimiento o errores. RIRFIT se proporciona
        según disponibilidad y dentro de los límites permitidos por la ley. No
        garantizamos resultados físicos o deportivos específicos.
      </p>
    ),
  },
  {
    title: "7. Suspensión y terminación",
    content: (
      <p>
        Podemos limitar o suspender cuentas que incumplan estos términos,
        comprometan la seguridad o perjudiquen a otras personas. Puedes dejar de
        usar el servicio y pedir la eliminación de tu cuenta en cualquier
        momento mediante estas <a href="/eliminar-cuenta">instrucciones</a>.
      </p>
    ),
  },
  {
    title: "8. Cambios y contacto",
    content: (
      <p>
        Podemos actualizar estos términos y publicaremos aquí la versión
        vigente. Si un cambio afecta materialmente el uso del servicio,
        procuraremos comunicarlo de manera razonable. Escríbenos a{` `}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> para cualquier
        consulta.
      </p>
    ),
  },
];

const deletionSections = [
  {
    title: "Solicita la eliminación",
    content: (
      <ol>
        <li>
          Escribe desde el correo asociado a tu cuenta a{` `}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Eliminación%20de%20cuenta%20RIRFIT`}
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </li>
        <li>
          Usa el asunto <strong>“Eliminación de cuenta RIRFIT”</strong> e indica
          tu nombre de usuario. No envíes tu contraseña.
        </li>
        <li>
          Te pediremos confirmar la solicitud desde el correo registrado para
          evitar que otra persona elimine tu cuenta.
        </li>
        <li>
          Tras verificarla, eliminaremos o desvincularemos la cuenta y los datos
          asociados que no debamos conservar por una obligación legal,
          prevención de fraude o resolución de disputas.
        </li>
      </ol>
    ),
  },
  {
    title: "Qué se elimina",
    content: (
      <p>
        La eliminación comprende el perfil, credenciales vinculadas, rutinas,
        entrenamientos, sesiones, fotos, pesajes, check-ins, métricas,
        preferencias y demás contenido personal asociado. Algunas copias de
        seguridad pueden permanecer temporalmente hasta completar su ciclo de
        borrado, sin volver a utilizarse para la operación ordinaria.
      </p>
    ),
  },
  {
    title: "Si ingresaste con Facebook o Google",
    content: (
      <p>
        Quitar RIRFIT desde la configuración de aplicaciones de Facebook o
        Google revoca el acceso futuro de RIRFIT a esa cuenta, pero no sustituye
        una solicitud de eliminación de los datos ya guardados en RIRFIT. Para
        eliminarlos, completa los pasos anteriores.
      </p>
    ),
  },
  {
    title: "Ayuda",
    content: (
      <p>
        Si ya no puedes acceder al correo registrado, escribe a{` `}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> e indica el
        problema. Solicitaremos información adicional para verificar que la
        cuenta te pertenece.
      </p>
    ),
  },
];

const pageContent = {
  privacidad: {
    eyebrow: "Tu información, con claridad",
    title: "Política de privacidad",
    intro:
      "Esta política explica qué información trata RIRFIT, para qué la utiliza y qué opciones tienes sobre tus datos.",
    sections: privacySections,
  },
  terminos: {
    eyebrow: "Reglas simples para entrenar mejor",
    title: "Términos de servicio",
    intro:
      "Estos términos regulan el acceso y uso de la plataforma RIRFIT y sus funciones de entrenamiento.",
    sections: termsSections,
  },
  eliminar_cuenta: {
    eyebrow: "Control sobre tus datos",
    title: "Eliminación de cuenta y datos",
    intro:
      "Puedes solicitar la eliminación permanente de tu cuenta de RIRFIT y de la información personal asociada.",
    sections: deletionSections,
  },
};

export default function LegalPage({ kind }) {
  const page = pageContent[kind] || pageContent.privacidad;

  return (
    <div className="legal-page">
      <header className="legal-header">
        <a className="legal-brand" href="/" aria-label="Ir a RIRFIT">
          <BrandWordmark
            className="legal-wordmark"
            accentClassName="legal-accent"
          />
          <span className="legal-brand-mark">
            <BrandMark />
          </span>
        </a>
        <a className="legal-back" href="/">
          <ArrowLeft aria-hidden="true" />
          Volver a RIRFIT
        </a>
      </header>

      <main className="legal-main">
        <div className="legal-hero">
          <p className="legal-eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="legal-intro">{page.intro}</p>
          <p className="legal-updated">Última actualización: {LAST_UPDATED}</p>
        </div>

        <article className="legal-content">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </article>

        <aside className="legal-contact">
          <Mail aria-hidden="true" />
          <div>
            <strong>¿Necesitas ayuda?</strong>
            <p>
              Escríbenos a{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </div>
        </aside>
      </main>

      <footer className="legal-footer">
        <span>© 2026 RIRFIT</span>
        <nav aria-label="Documentos legales">
          <a href="/privacidad">Privacidad</a>
          <a href="/terminos">Términos</a>
          <a href="/eliminar-cuenta">Eliminar cuenta</a>
        </nav>
      </footer>
    </div>
  );
}

LegalPage.propTypes = {
  kind: PropTypes.oneOf(["privacidad", "terminos", "eliminar_cuenta"])
    .isRequired,
};
