---
layout: page
title: Blog
lang: en
locale: en-US
---

<h1>Blog</h1>

{% for post in collections.posts %}
  <article class="mb-6">
    <a class="text-xl font-semibold" href="{{ post.url }}">{{ post.data.title }}</a>
  <div class="text-sm text-slate-500">{{ post.date | date: "yyyy-MM-dd" }}</div>
  <p class="mt-2">{{ post.templateContent | strip_html | truncate: 160, true }}</p>
  </article>
{% endfor %}
