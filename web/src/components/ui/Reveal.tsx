import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Reveal-on-scroll wrapper. Server component — ships no JS of its own.
 *
 * The actual observing is done by the tiny inline script in the locale
 * layout (see REVEAL_SCRIPT), which runs before React hydrates, so
 * above-the-fold content appears immediately even on slow connections.
 * The animation is pure CSS (globals.css `.reveal`) and is skipped when
 * JS is unavailable or prefers-reduced-motion is set.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  style,
}: {
  children: ReactNode;
  className?: string;
  /** ms, for stagger */
  delay?: number;
  as?: keyof React.JSX.IntrinsicElements;
  style?: React.CSSProperties;
}) {
  const Comp = Tag as React.ElementType;
  return (
    <Comp
      className={clsx("reveal", className)}
      style={{ ...style, ...(delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : {}) }}
    >
      {children}
    </Comp>
  );
}

/**
 * Inline, pre-hydration script: marks <html class="js">, observes every
 * `.reveal` (present now or added later by client navigation) and adds
 * `is-in` once it enters the viewport. It also marks a `.photo-dev` photo
 * `is-dev` once its image has loaded (or failed), so it can fade up.
 */
export const REVEAL_SCRIPT = `
(function(){
  var d=document,h=d.documentElement;h.classList.add('js');
  if(!('IntersectionObserver' in window)){h.classList.remove('js');return;}
  var io=new IntersectionObserver(function(es){for(var i=0;i<es.length;i++){var e=es[i];if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target);}}},{rootMargin:'0px 0px -10% 0px',threshold:0.1});
  function dev(img){var c=img.closest&&img.closest('.photo-dev');if(c)c.classList.add('is-dev');}
  d.addEventListener('load',function(e){if(e.target.tagName==='IMG')dev(e.target);},true);
  d.addEventListener('error',function(e){if(e.target.tagName==='IMG')dev(e.target);},true);
  function scan(r){var n=r.querySelectorAll?r.querySelectorAll('.reveal:not(.is-in)'):[];for(var i=0;i<n.length;i++)io.observe(n[i]);if(r.classList&&r.classList.contains('reveal'))io.observe(r);
    var m=r.querySelectorAll?r.querySelectorAll('.photo-dev:not(.is-dev) img'):[];for(var k=0;k<m.length;k++)if(m[k].complete)dev(m[k]);}
  function start(){scan(d.body);new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;for(var j=0;j<a.length;j++)if(a[j].nodeType===1)scan(a[j]);}}).observe(d.body,{childList:true,subtree:true});}
  d.body?start():d.addEventListener('DOMContentLoaded',start);
})();`;
