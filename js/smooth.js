(function(){
  var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -6% 0px'}):null;
  function watch(root){(root||document).querySelectorAll('.rv:not(.in)').forEach(function(el){io?io.observe(el):el.classList.add('in');});
    (root||document).querySelectorAll('img[loading="lazy"]:not(.fade)').forEach(function(im){im.classList.add('fade');if(im.complete&&im.naturalWidth)im.classList.add('ok');else{im.addEventListener('load',function(){im.classList.add('ok');});im.addEventListener('error',function(){im.classList.add('ok');});}});}
  window.NomioSmooth=watch;
  // highlight current section in nav (home page)
  var links=[].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  if(links.length&&io){var so=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id);});}});},{rootMargin:'-45% 0px -50% 0px'});
    links.forEach(function(a){var s=document.querySelector(a.getAttribute('href'));if(s)so.observe(s);});}
  // keep active tab visible in mobile scroll strip
  var cur=document.querySelector('.nav a[aria-current="page"]');if(cur&&cur.scrollIntoView)cur.scrollIntoView({inline:'center',block:'nearest'});
  if(document.readyState!=='loading')watch();else document.addEventListener('DOMContentLoaded',function(){watch();});
  new MutationObserver(function(){watch();}).observe(document.body,{childList:true,subtree:true});
})();
