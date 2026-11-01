"use client";

import type { ComponentProps, MouseEvent } from "react";

type Props = ComponentProps<"a"> & { href: string };

export function FastLink({ href, onClick, target, ...props }: Props) {
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !href.startsWith("/") ||
      href.startsWith("//") ||
      (target && target !== "_self")
    )
      return;

    event.preventDefault();
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current !== href) window.history.pushState(null, "", href);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(".simple-classroom main h1")
        ?.focus({ preventScroll: true });
    });
  }

  return <a {...props} href={href} target={target} onClick={navigate} />;
}
