import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./Textarea";

const meta: Meta<typeof Textarea> = {
  component: Textarea,
  title: "Primitivas/Textarea",
};

export default meta;
type Historia = StoryObj<typeof Textarea>;

export const Normal: Historia = {
  args: { etiqueta: "Descripción de la falla", placeholder: "¿Qué pasó?" },
};

export const ConError: Historia = {
  args: { etiqueta: "Descripción de la falla", error: "Describe la falla en al menos 10 caracteres" },
};
