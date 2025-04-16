const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(directionalLight);

const earthGeometry = new THREE.SphereGeometry(5, 64, 64);
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
const earthMaterial = new THREE.MeshPhongMaterial({map: earthTexture});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

camera.position.z = 15;
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const packages = new Map();
const suspiciousColor = 0xff0000;
const normalColor = 0x00ff00;

function updatePackage(lat, lng, suspicious) {
    const color = suspicious ? suspiciousColor : normalColor;

    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({color});

    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(
        -5.2 * Math.sin(phi) * Math.cos(theta),
        5.2 * Math.cos(phi),
        5.2 * Math.sin(phi) * Math.sin(theta)
    );
    scene.add(marker);
}

let normalChart, suspiciousChart;
const maxHistory = 30;
const historyData = {
    labels: Array(maxHistory).fill(''),
    normal: Array(maxHistory).fill(0),
    suspicious: Array(maxHistory).fill(0)
};

function initCharts() {
    const normalCtx = document.getElementById('normalChart').getContext('2d');
    const suspiciousCtx = document.getElementById('suspiciousChart').getContext('2d');

    normalChart = new Chart(normalCtx, {
        type: 'line',
        data: {
            labels: historyData.labels,
            datasets: [{
                label: '',
                data: historyData.normal,
                borderColor: 'rgba(0, 255, 0, 1)',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: getChartOptions('Confident Packages')
    });

    suspiciousChart = new Chart(suspiciousCtx, {
        type: 'line',
        data: {
            labels: historyData.labels,
            datasets: [{
                label: '',
                data: historyData.suspicious,
                borderColor: 'rgba(255, 0, 0, 1)',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: getChartOptions('Suspicious Packages')
    });
}

function getChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: title,
                color: '#fff',
                font: {
                    size: 14
                }
            },
            legend: {
                labels: {
                    color: '#fff',
                    boxWidth: 0,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff'
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#ccc',
                    maxRotation: 45,
                    minRotation: 45
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#ccc'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            }
        },
        animation: {
            duration: 300
        },
        elements: {
            point: {
                radius: 3,
                hoverRadius: 5
            }
        }
    };
}

function updateCharts(normal, suspicious) {
    historyData.labels.shift();
    historyData.normal.shift();
    historyData.suspicious.shift();

    const now = new Date();
    historyData.labels.push(now.toLocaleTimeString());
    historyData.normal.push(normal);
    historyData.suspicious.push(suspicious);

    normalChart.update();
    suspiciousChart.update();
}

let maxTime = 0;
let history = [];

function fetchData() {
    fetch(`http://localhost:5000/data?time=${maxTime}`)
        .then(response => response.json())
        .then(newData => {
            if (newData.length > 0) {
                history = [...history, ...newData];
                maxTime = Math.max(...newData.map(item => item.time), maxTime);

                const newNormal = newData.filter(item => !item.suspicious).length;
                const newSuspicious = newData.filter(item => item.suspicious).length;

                updateCharts(newNormal, newSuspicious);

                scene.children = scene.children.filter(obj =>
                    obj === earth || obj === ambientLight || obj === directionalLight
                );

                history.forEach(item => {
                    if (maxTime - item.time < 60) {
                        updatePackage(item.latitude, item.longitude, item.suspicious);
                    }
                });
            }
        })
        .catch(err => console.error('Ошибка получения данных:', err));
}

window.onload = function() {
    initCharts();
    fetchData();
    setInterval(fetchData, 1000);
    animate();
};

function animate() {
    requestAnimationFrame(animate);
    directionalLight.position.copy(camera.position);
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const maxTrafficItems = 20;
let trafficItems = [];

function addToTrafficList(data) {
    const trafficList = document.getElementById('trafficList');

    const item = document.createElement('div');
    item.className = `traffic-item ${data.suspicious ? 'suspicious' : 'normal'}`;

    const time= new Date(data.time * 1000).toLocaleTimeString();

    item.innerHTML = `
        <div class="traffic-ip">${data.ip}</div>
        <div class="traffic-location">📍 ${data.latitude.toFixed(2)}°, ${data.longitude.toFixed(2)}°</div>
        <div class="traffic-time">${time}</div>
    `;

    item.addEventListener('click', () => {
        console.log('Selected traffic:', data);
    });

    trafficList.insertBefore(item, trafficList.firstChild);

    while (trafficList.children.length > maxTrafficItems) {
        trafficList.removeChild(trafficList.lastChild);
    }

    trafficItems.unshift(data);
    if (trafficItems.length > maxTrafficItems) {
        trafficItems.pop();
    }
}

function fetchData() {
    fetch(`http://localhost:5000/data?time=${maxTime}`)
        .then(response => response.json())
        .then(newData => {
            if (newData.length > 0) {
                history = [...history, ...newData];
                maxTime = Math.max(...newData.map(item => item.time), maxTime);

                const newNormal = newData.filter(item => !item.suspicious).length;
                const newSuspicious = newData.filter(item => item.suspicious).length;

                updateCharts(newNormal, newSuspicious);

                newData.forEach(item => addToTrafficList(item));

                scene.children = scene.children.filter(obj =>
                    obj === earth || obj === ambientLight || obj === directionalLight
                );

                history.forEach(item => {
                    if (maxTime - item.time < 60) {
                        updatePackage(item.latitude, item.longitude, item.suspicious);
                    }
                });
            }
        })
        .catch(err => console.error('Ошибка получения данных:', err));
}
function initFilterButton() {
    const toggle = document.getElementById('suspiciousToggle');

    toggle.addEventListener('change', () => {
        showOnlySuspicious = toggle.checked;
        updateTrafficList();
    });
}

function updateTrafficList() {
    const trafficList = document.getElementById('trafficList');
    trafficList.innerHTML = '';

    const itemsToShow = showOnlySuspicious
        ? trafficItems.filter(item => item.suspicious)
        : trafficItems;

    const items = showOnlySuspicious ? itemsToShow : trafficItems;

    items.forEach(data => {
        if (!showOnlySuspicious || data.suspicious) {
            const item = document.createElement('div');
            item.className = `traffic-item ${data.suspicious ? 'suspicious' : 'normal'}`;
            const time = new Date(data.time * 1000).toLocaleTimeString();

            item.innerHTML = `
                <div class="traffic-ip">${data.ip}</div>
                <div class="traffic-location">${data.latitude.toFixed(2)}°, ${data.longitude.toFixed(2)}°</div>
                <div class="traffic-time">${time}</div>
            `;

            item.addEventListener('click', () => {
                console.log('Selected traffic:', data);
            });

            trafficList.appendChild(item);
        }
    });
}