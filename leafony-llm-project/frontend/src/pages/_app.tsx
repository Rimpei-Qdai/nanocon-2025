import "@/styles/globals.css";
import type { AppProps } from "next/app";
import UIController from "../components/UIController";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <UIController userId="default" />
    </>
  );
}
