import type { Preview } from "@storybook/react-vite";
import { ProveedorI18n } from "../src/i18n/contexto";
import "../src/base.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "acero-900",
      values: [{ name: "acero-900", value: "#14181D" }],
    },
    a11y: {
      test: "error",
    },
  },
  decorators: [
    (Historia) => (
      <ProveedorI18n>
        <Historia />
      </ProveedorI18n>
    ),
  ],
};

export default preview;
