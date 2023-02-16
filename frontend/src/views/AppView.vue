<template lang="pug">
h1 Your websites
.d-flex
	p.new-website-btn.btn.btn-outline-success Add website

#website-container
	//if websites
	//	each website in websites
	//		a.website(href="/overview/" + website.id)
	//			h3= website.name
	//else
	//	.jumbotron
	//		h2 Seems like here are no websites yet!
	//		p Add a website to start
	//		p.new-website-btn.btn.btn-success Add website
</template>

<script setup lang="ts"></script>

<style scoped></style>
