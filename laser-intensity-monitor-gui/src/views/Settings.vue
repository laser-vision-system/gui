<script setup>
import { useTheme } from '../composables/useTheme'
const { theme, toggleTheme } = useTheme()
</script>
<template>
    <div class="container">
        <div class="row p-3">
            <div class="col text-center">
                <h5 class="fw-bold" v-if="theme === 'dark'">Dark Mode</h5>
                <h5 class="fw-bold" v-if="theme === 'light'">Light Mode</h5>
                <label class="switch">
                    <input type="checkbox" class="switch-input" :checked="theme === 'dark'" @change="toggleTheme">
                    <span class="slider round"></span>
                </label>
            </div>

        </div>
    </div>
</template>
<style scoped>
.switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: .4s;
    transition: .4s;
}

.slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    -webkit-transition: .4s;
    transition: .4s;
}

input:checked+.slider {
    background-color: darkslateblue;
}

input:focus+.slider {
    box-shadow: 0 0 1px mediumslateblue;
}

input:checked+.slider:before {
    -webkit-transform: translateX(26px);
    -ms-transform: translateX(26px);
    transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
    border-radius: 34px;
}

.slider.round:before {
    border-radius: 50%;
}
</style>
