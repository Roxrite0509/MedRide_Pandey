import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const AnimatedBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const animationIdRef = useRef<number>();
  const spiralRef = useRef<THREE.Group>();
  const gridRef = useRef<THREE.Group>();
  const heartRef = useRef<THREE.Group>();

  const [webglSupported, setWebglSupported] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const mouseRef = useRef(new THREE.Vector2());
  const cardPositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!mountRef.current) return;

    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    // Scene setup (transparent background so DOM card can show canvas underneath)
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: window.devicePixelRatio <= 1,
      alpha: true,
      powerPreference: 'default'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // Add renderer to DOM
    mountRef.current.appendChild(renderer.domElement);

    // Dynamic grid that covers the entire viewport
    const gridGroup = new THREE.Group();
    const aspectRatio = window.innerWidth / window.innerHeight;
    const gridSize = Math.max(25, Math.ceil(aspectRatio * 20));
    const gridSpacing = 0.4;

    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        // Create plus symbol using two perpendicular lines
        const plusGroup = new THREE.Group();
        
        // Horizontal line
        const hLineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.02, 0, 0),
          new THREE.Vector3(0.02, 0, 0)
        ]);
        const softColor = 0xff0000;
        const baseOpacity = 0.9;
        const hLineMaterial = new THREE.LineBasicMaterial({
          color: softColor,
          transparent: true,
          opacity: baseOpacity
        });
        const hLine = new THREE.Line(hLineGeometry, hLineMaterial);
        plusGroup.add(hLine);
        
        // Vertical line
        const vLineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -0.02, 0),
          new THREE.Vector3(0, 0.02, 0)
        ]);
        const vLineMaterial = new THREE.LineBasicMaterial({
          color: softColor,
          transparent: true,
          opacity: baseOpacity
        });
        const vLine = new THREE.Line(vLineGeometry, vLineMaterial);
        plusGroup.add(vLine);
        
        // Position the plus symbol
        plusGroup.position.set(i * gridSpacing, j * gridSpacing, -2);
        plusGroup.userData.baseOpacity = baseOpacity;
        gridGroup.add(plusGroup);
      }
    }

    gridRef.current = gridGroup;
    scene.add(gridGroup);

    // Create simple organic pulsating heart
    const heartGroup = new THREE.Group();
    
    // Simple heart with 3 layers for organic effect
    const heartCount = 3;
    
    for (let i = 0; i < heartCount; i++) {
      const points = [];
      const segments = 300;
      const scale = 1 + i * 0.08;
      
      for (let j = 0; j <= segments; j++) {
        const t = (j / segments) * Math.PI * 2;
        
        // Heart shape parametric equations
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        
        // Simple scaling without viewport calculations
        const scaledX = x * scale * 0.015;
        const scaledY = (y * scale * 0.015) + 1.5; // Position so only top parts show above card
        
        points.push(new THREE.Vector3(scaledX, scaledY, i * 0.02));
      }
      
      const heartGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const heartMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.9 - (i * 0.15),
        linewidth: 2
      });
      
      const heartLine = new THREE.Line(heartGeometry, heartMaterial);
      heartGroup.add(heartLine);
    }
    
    // Simple positioning - centered, only top visible above card
    heartGroup.position.set(0, 0, -1);
    heartGroup.scale.set(3, 3, 3); // Fixed scale, no calculations
    heartRef.current = heartGroup;
    scene.add(heartGroup);

    // Simple spiral
    const spiralGroup = new THREE.Group();
    const circleCount = 5;
    const radius = 2.5;
    
    for (let i = 0; i < circleCount; i++) {
      const circleGeometry = new THREE.RingGeometry(radius + i * 0.12, radius + i * 0.12 + 0.025, 64);
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      
      const circle = new THREE.Mesh(circleGeometry, circleMaterial);
      circle.position.z = i * 0.08;
      spiralGroup.add(circle);
    }
    
    spiralGroup.position.set(0, 0, -1);
    spiralGroup.scale.set(1.5, 1.5, 1.5);
    spiralRef.current = spiralGroup;
    scene.add(spiralGroup);

    // Mouse and click handlers
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      const distance = Math.sqrt(mouseRef.current.x ** 2 + mouseRef.current.y ** 2);
      setIsHovering(distance < 0.8);
    };

    const handleClick = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      const distance = Math.sqrt(mouseRef.current.x ** 2 + mouseRef.current.y ** 2);
      if (distance < 0.8) {
        setIsHovering(prev => !prev);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    
    // Listen for card position sync events
    const handleHeartSync = (event: CustomEvent) => {
      if (heartRef.current && event.detail) {
        cardPositionRef.current = {
          x: event.detail.centerX,
          y: event.detail.centerY
        };
        
        // Simple positioning - just follow the card position
        heartRef.current.position.x = event.detail.centerX * 2;
        heartRef.current.position.y = event.detail.centerY * 2;
        
        if (spiralRef.current) {
          spiralRef.current.position.x = event.detail.centerX * 2;
          spiralRef.current.position.y = event.detail.centerY * 2;
        }
      }
    };
    
    window.addEventListener('syncHeartPosition', handleHeartSync as EventListener);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      // Simple heart animation
      if (spiralRef.current && heartRef.current) {
        if (isHovering) {
          // Transition to spiral
          heartRef.current.children.forEach((child) => {
            const line = child as THREE.Line;
            if (line.material instanceof THREE.LineBasicMaterial) {
              line.material.opacity = Math.max(0, line.material.opacity - 0.08);
            }
          });
          
          spiralRef.current.children.forEach((child, index) => {
            const mesh = child as THREE.Mesh;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              const targetOpacity = 0.8 - (index * 0.1);
              mesh.material.opacity = Math.min(targetOpacity, mesh.material.opacity + 0.08);
            }
          });
          
          spiralRef.current.rotation.z += 0.015;
          const scale = 1 + Math.sin(time * 3) * 0.1;
          spiralRef.current.scale.set(scale, scale, 1);
        } else {
          // Transition back to heart - simple organic pulsating
          spiralRef.current.children.forEach((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              mesh.material.opacity = Math.max(0, mesh.material.opacity - 0.08);
            }
          });
          
          heartRef.current.children.forEach((child, index) => {
            const line = child as THREE.Line;
            if (line.material instanceof THREE.LineBasicMaterial) {
              const targetOpacity = 0.8 - (index * 0.12);
              line.material.opacity = Math.min(targetOpacity, line.material.opacity + 0.08);
            }
          });
          
          // Simple organic pulsating heart effect
          heartRef.current.children.forEach((child, index) => {
            const beatOffset = index * 0.3;
            const heartbeatCycle = (time * 2.5) + beatOffset;
            const beat1 = Math.sin(heartbeatCycle) * 0.5 + 0.5;
            const beat2 = Math.sin(heartbeatCycle * 1.618 + Math.PI * 0.4) * 0.3;
            const organicPulse = Math.sin(heartbeatCycle * 0.7) * 0.1;
            const combinedBeat = (beat1 + beat2 + organicPulse) * 0.6;
            
            const beatScale = 1 + combinedBeat * (0.15 - index * 0.02);
            const breathingVariation = Math.sin((time * 0.8) + index * 0.5) * 0.02;
            
            child.scale.set(beatScale + breathingVariation, beatScale + breathingVariation, 1);
            child.rotation.z = Math.sin((time * 0.9) + index * 1.2) * 0.015 + Math.cos((time * 0.4) + index) * 0.008;
          });
        }
      }

      // Grid animation
      if (gridRef.current) {
        gridRef.current.rotation.z += 0.002;
        const globalPulse = 0.28 + Math.sin(time) * 0.02;
        const cardRadius = 3.5;

        gridRef.current.children.forEach((plusGroup) => {
          const dist = Math.hypot(plusGroup.position.x, plusGroup.position.y);
          const factor = Math.min(1, Math.max(0, (dist / cardRadius)));
          const base = plusGroup.userData.baseOpacity ?? 0.8;
          const wobble = Math.sin(time + dist) * 0.02;
          const targetOpacity = base * (0.05 + 0.95 * Math.pow(factor, 1.5)) + wobble;

          if (plusGroup instanceof THREE.Group) {
            plusGroup.children.forEach((line) => {
              if (line instanceof THREE.Line && line.material instanceof THREE.LineBasicMaterial) {
                line.material.opacity += (targetOpacity - line.material.opacity) * 0.08;
              }
            });
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      
      // Regenerate grid
      if (gridRef.current) {
        scene.remove(gridRef.current);
        
        const newGridGroup = new THREE.Group();
        const aspectRatio = width / height;
        const newGridSize = Math.max(25, Math.ceil(aspectRatio * 20));
        const gridSpacing = 0.4;
        
        for (let i = -newGridSize; i <= newGridSize; i++) {
          for (let j = -newGridSize; j <= newGridSize; j++) {
            const plusGroup = new THREE.Group();
            
            const hLineGeometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(-0.02, 0, 0),
              new THREE.Vector3(0.02, 0, 0)
            ]);
            const softColor = 0xff0000;
            const baseOpacity = 0.9;
            const hLineMaterial = new THREE.LineBasicMaterial({
              color: softColor,
              transparent: true,
              opacity: baseOpacity
            });
            const hLine = new THREE.Line(hLineGeometry, hLineMaterial);
            plusGroup.add(hLine);
            
            const vLineGeometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(0, -0.02, 0),
              new THREE.Vector3(0, 0.02, 0)
            ]);
            const vLineMaterial = new THREE.LineBasicMaterial({
              color: softColor,
              transparent: true,
              opacity: baseOpacity
            });
            const vLine = new THREE.Line(vLineGeometry, vLineMaterial);
            plusGroup.add(vLine);
            
            plusGroup.position.set(i * gridSpacing, j * gridSpacing, -2);
            plusGroup.userData.baseOpacity = baseOpacity;
            newGridGroup.add(plusGroup);
          }
        }
        
        gridRef.current = newGridGroup;
        scene.add(newGridGroup);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('syncHeartPosition', handleHeartSync as EventListener);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      scene.traverse((object: any) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material?.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      
      renderer.dispose();
    };
  }, []);

  if (!webglSupported) {
    return (
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
        }}
      />
    );
  }

  return (
    <div 
      ref={mountRef} 
      className="fixed inset-0 -z-10"
      style={{ 
        width: '100vw', 
        height: '100vh',
        overflow: 'hidden'
      }}
    />
  );
};

export default AnimatedBackground;