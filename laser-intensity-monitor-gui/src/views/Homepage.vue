<script setup>
import cameraFeed from "../components/CameraFeed.vue"
</script>
<template>
    <div class="container">
        <div class="row p-1">
            <div class="col-3 text-center d-flex justify-content-center">
                <table class="table border border-3 border-black">
                    <thead>
                        <tr>
                            <th scope="col">Connected microComputers</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Rasberry pie 5 8Gb: ID-00</td>
                        </tr>
                        <tr>
                            <th scope="col">Disconected microComputers</th>
                        </tr>
                        <tr>
                            <td>N/a</td>
                        </tr>
                        <tr>
                            <th scope="col">Disconected Cameras</th>
                        </tr>
                        <tr v-for="feed in cameraFeeds" :key="feed.id">
                            <td v-if="!feed.isConnected">{{ feed.name }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="col-9 p-3">
                <h3>Cameras Connected</h3>
                <div class="row d-flex justify-content-start p-3">
                    <div class="col-3" v-for="feed in cameraFeeds" :key="feed.id">
                        <div v-if="feed.isConnected">
                            <div :class="feed.isSelected ? 'card bg-success' : 'card'">
                                <div class="card-body">
                                    <h5 class="card-title">Camera: {{ feed.name }}</h5>
                                    <p>Brightness: {{ feed.brightness }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-9 d-flex justify-content-end">
                <cameraFeed />
            </div>
            <div class="col-3 text-start">
                <h3>Camera Info</h3>
                <div v-for="feed in cameraFeeds">
                    <div v-if="feed.isSelected">
                        <p>Camera: {{ feed.name }}</p>
                        <p>Description: {{ feed.description }}</p>
                        <p>fps: {{ feed.fps }}</p>
                        <p>Brightness: {{ feed.brightness }}</p>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>
<script>
export default {
    data() {
        return {
            cameraFeeds: [
                { name: "cam00 ", id: '00', description: 'Camera 1 Description', fps: '2', brightness: '0.99', isConnected: true, isSelected: true },
                { name: "cam01 ", id: '01', description: 'Camera 2 Description', fps: 'N/a', brightness: '0.99', isConnected: false, isSelected: false }
            ]
        }
    }
}
</script>
