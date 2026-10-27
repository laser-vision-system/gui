<!--  The purpose of this component is to provide a footer with a link to the user manual through out the whole app -->
<script setup>
  import hintIcon from '../assets/images/manual.svg'
</script>
<template>
<teleport to="body">
    <footer class="footer text-center d-flex  align-items-center justify-content-center">
        <p class="m-0 d-flex align-items-center gap-2">
            View the user manual
            <a href="https://laser-vision-system.github.io/" target="_blank" class="d-flex gap-2 justify-content-center align-items-center">
                here
                <img :src="hintIcon" alt="" width="30px" height="30px" class="hint-image">
            </a>
        </p>
    </footer>
</teleport>

</template>
<style scoped>

a {
  color: var(--bs-body-color);
  background-color: transparent;
  text-decoration: underline;
  font-weight: 600;
}

.footer{
    color: var(--camera-tab-text);
    background-color: var(--nav-bg);
    height: 3rem;
    flex-shrink: 0;
}
:global(body) {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

:global(#app) {
  flex: 1 0 auto;
}
</style>
