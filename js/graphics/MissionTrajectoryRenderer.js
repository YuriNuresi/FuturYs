/**
 * 🚀 FUTURY - Mission Trajectory Renderer
 * Renders realistic Hohmann transfer orbit trajectories for space missions
 * @version 1.0.0
 */

import * as THREE from 'three';

export class MissionTrajectoryRenderer {
    constructor(scene, planets) {
        this.scene = scene;
        this.planets = planets; // Map of planet meshes by name
        this.trajectories = new Map(); // mission.id → trajectory object
        this.visible = true;

        // Create sprite texture for spacecraft
        this.spacecraftSprite = this.createSpacecraftSprite();
    }

    /**
     * Create a simple sprite texture for spacecraft
     */
    createSpacecraftSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Draw a glowing dot for spacecraft
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(79, 209, 199, 1)');
        gradient.addColorStop(0.5, 'rgba(79, 209, 199, 0.5)');
        gradient.addColorStop(1, 'rgba(79, 209, 199, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        return material;
    }

    /**
     * Add a mission trajectory
     */
    addMission(mission) {
        if (this.trajectories.has(mission.id)) {
            return; // Already exists
        }

        const origin = this.getPlanetPosition(mission.origin);
        const destination = this.getPlanetPosition(mission.destination);

        if (!origin || !destination) {
            console.warn(`Cannot create trajectory: planet not found`, mission);
            return;
        }

        const trajectory = this.createTrajectory(mission, origin, destination);
        this.trajectories.set(mission.id, trajectory);

        if (this.visible) {
            this.scene.add(trajectory.group);
        }

        console.log(`[Trajectory] Added mission ${mission.id}: ${mission.origin} → ${mission.destination}`);
    }

    /**
     * Get planet position by name
     */
    getPlanetPosition(planetName) {
        const planet = this.planets.get(planetName);
        if (planet) {
            return planet.position.clone();
        }
        return null;
    }

    /**
     * Create trajectory using Hohmann transfer orbit (simplified ellipse)
     */
    createTrajectory(mission, origin, destination) {
        const group = new THREE.Group();
        group.name = `trajectory-${mission.id}`;

        // Calculate ellipse parameters
        const r1 = origin.length(); // Distance from sun (origin)
        const r2 = destination.length(); // Distance from sun (destination)
        const semiMajorAxis = (r1 + r2) / 2;

        // Generate elliptical path points
        const numPoints = 200;
        const points = [];

        // Calculate angle between origin and destination
        const startAngle = Math.atan2(origin.z, origin.x);
        const endAngle = Math.atan2(destination.z, destination.x);

        // Normalize angle difference
        let angleDiff = endAngle - startAngle;
        if (angleDiff < 0) angleDiff += Math.PI * 2;
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        // Generate points along elliptical arc
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const angle = startAngle + angleDiff * t;

            // Ellipse equation (simplified Hohmann transfer)
            const eccentricity = Math.abs(r2 - r1) / (r2 + r1);
            const radius = semiMajorAxis * (1 - eccentricity * eccentricity) /
                          (1 + eccentricity * Math.cos(angle - startAngle));

            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            const y = 0; // Keep in ecliptic plane

            points.push(new THREE.Vector3(x, y, z));
        }

        // Create geometry
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Split into completed (red) and remaining (green) sections
        const completedLine = new THREE.Line(
            geometry.clone(),
            new THREE.LineBasicMaterial({
                color: 0xff4444,
                linewidth: 2,
                transparent: true,
                opacity: 0.8
            })
        );

        const remainingLine = new THREE.Line(
            geometry.clone(),
            new THREE.LineBasicMaterial({
                color: 0x44ff44,
                linewidth: 2,
                transparent: true,
                opacity: 0.6
            })
        );

        group.add(completedLine);
        group.add(remainingLine);

        // Create spacecraft sprite
        const spacecraft = new THREE.Sprite(this.spacecraftSprite.clone());
        spacecraft.scale.set(2, 2, 1); // Make it visible
        spacecraft.name = 'spacecraft';
        group.add(spacecraft);

        // Store trajectory data
        return {
            group,
            mission,
            points,
            completedLine,
            remainingLine,
            spacecraft,
            numPoints
        };
    }

    /**
     * Update trajectories based on mission progress
     */
    update(missions) {
        missions.forEach(mission => {
            // Add new trajectories
            if (!this.trajectories.has(mission.id) && mission.status === 'TRAVELING') {
                this.addMission(mission);
            }

            // Update existing trajectories
            const trajectory = this.trajectories.get(mission.id);
            if (trajectory) {
                this.updateTrajectoryProgress(trajectory, mission);

                // Remove completed missions
                if (mission.status === 'ARRIVED' || mission.status === 'COMPLETED') {
                    this.removeMission(mission.id);
                }
            }
        });
    }

    /**
     * Update trajectory visualization based on mission progress
     */
    updateTrajectoryProgress(trajectory, mission) {
        const progress = mission.progress || 0;
        const { points, completedLine, remainingLine, spacecraft, numPoints } = trajectory;

        // Calculate split index based on progress
        const splitIndex = Math.floor(numPoints * progress);

        // Update completed section (red)
        if (splitIndex > 0) {
            const completedPoints = points.slice(0, splitIndex + 1);
            const completedGeometry = new THREE.BufferGeometry().setFromPoints(completedPoints);
            completedLine.geometry.dispose();
            completedLine.geometry = completedGeometry;
            completedLine.visible = true;
        } else {
            completedLine.visible = false;
        }

        // Update remaining section (green)
        if (splitIndex < numPoints) {
            const remainingPoints = points.slice(splitIndex);
            const remainingGeometry = new THREE.BufferGeometry().setFromPoints(remainingPoints);
            remainingLine.geometry.dispose();
            remainingLine.geometry = remainingGeometry;
            remainingLine.visible = true;
        } else {
            remainingLine.visible = false;
        }

        // Update spacecraft position
        if (splitIndex < points.length) {
            const currentPoint = points[splitIndex];
            spacecraft.position.copy(currentPoint);
        }
    }

    /**
     * Remove a mission trajectory
     */
    removeMission(missionId) {
        const trajectory = this.trajectories.get(missionId);
        if (trajectory) {
            this.scene.remove(trajectory.group);

            // Dispose geometries and materials
            trajectory.completedLine.geometry.dispose();
            trajectory.completedLine.material.dispose();
            trajectory.remainingLine.geometry.dispose();
            trajectory.remainingLine.material.dispose();
            trajectory.spacecraft.material.dispose();

            this.trajectories.delete(missionId);
            console.log(`[Trajectory] Removed mission ${missionId}`);
        }
    }

    /**
     * Toggle visibility of all trajectories
     */
    toggleVisibility() {
        this.visible = !this.visible;

        this.trajectories.forEach(trajectory => {
            trajectory.group.visible = this.visible;
        });

        console.log(`[Trajectory] Visibility: ${this.visible ? 'ON' : 'OFF'}`);
        return this.visible;
    }

    /**
     * Set visibility
     */
    setVisibility(visible) {
        this.visible = visible;

        this.trajectories.forEach(trajectory => {
            trajectory.group.visible = visible;
        });
    }

    /**
     * Focus camera on a specific mission trajectory
     */
    focusOnMission(missionId, camera, controls) {
        const trajectory = this.trajectories.get(missionId);
        if (!trajectory) {
            console.warn(`Mission ${missionId} not found`);
            return;
        }

        const { spacecraft } = trajectory;

        // Calculate camera position (offset from spacecraft)
        const offset = new THREE.Vector3(0, 50, 50);
        const targetPos = spacecraft.position.clone().add(offset);

        // Animate camera (if controls support it)
        if (controls && controls.target) {
            controls.target.copy(spacecraft.position);
        }

        // Simple camera position update (can be animated with TWEEN.js if needed)
        camera.position.lerp(targetPos, 0.1);
        camera.lookAt(spacecraft.position);

        console.log(`[Trajectory] Focused on mission ${missionId}`);
    }

    /**
     * Clear all trajectories
     */
    clear() {
        this.trajectories.forEach((trajectory, missionId) => {
            this.removeMission(missionId);
        });
        console.log('[Trajectory] Cleared all trajectories');
    }

    /**
     * Get trajectory count
     */
    getCount() {
        return this.trajectories.size;
    }
}
