import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Phone, MapPin, Navigation, Stethoscope, Hospital, Search, Filter, X, Map, Loader2, ExternalLink, Route } from "lucide-react";
import { medicalCenters as staticMedicalCenters, type MedicalCenter } from "@/data/medicalCenters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { firestoreDb, collection, getDocs } from "@/lib/firebase";

// Declare Google Maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

// Load Google Maps script
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      if (window.google && window.google.maps) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&language=ar&region=SA&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function findNearestCenter(userLat: number, userLng: number, centers: MedicalCenter[]): MedicalCenter | null {
  if (centers.length === 0) return null;

  let nearest = centers[0];
  let minDistance = calculateDistance(userLat, userLng, centers[0].latitude, centers[0].longitude);

  for (let i = 1; i < centers.length; i++) {
    const distance = calculateDistance(userLat, userLng, centers[i].latitude, centers[i].longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = centers[i];
    }
  }

  return nearest;
}

// Function to open Google Maps with directions
function openGoogleMaps(center: MedicalCenter, userLocation?: { lat: number; lng: number } | null) {
  const { latitude, longitude, name, address } = center;
  
  if (userLocation) {
    // Open with directions from user location
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${latitude},${longitude}&travelmode=driving`;
    window.open(url, '_blank');
  } else {
    // Open just the location
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${encodeURIComponent(name + ' ' + address)}`;
    window.open(url, '_blank');
  }
}

// Format distance display
function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} متر`;
  }
  return `${distance.toFixed(1)} كم`;
}

export function MedicalCentersMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const userInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestCenter, setNearestCenter] = useState<MedicalCenter | null>(null);
  const [selectedTab, setSelectedTab] = useState<"all" | "clinic" | "hospital">("all");
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 30.0444, lng: 31.2357 }); // Default: Cairo
  const [mapZoom, setMapZoom] = useState(6);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [dynamicCenters, setDynamicCenters] = useState<MedicalCenter[]>([]);

  // Load medical centers from Firestore
  useEffect(() => {
    const loadDynamicCenters = async () => {
      try {
        const snap = await getDocs(collection(firestoreDb, "medicalCenters"));
        const centers = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            type: data.type,
            address: data.address,
            phone: data.phone,
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city,
            country: data.country || "مصر",
            specialties: data.specialties || [],
          } as MedicalCenter;
        });
        setDynamicCenters(centers);
      } catch (error) {
        console.error("Error loading medical centers:", error);
      }
    };
    loadDynamicCenters();
  }, []);

  // Combine static and dynamic centers
  const medicalCenters = useMemo(() => {
    return [...staticMedicalCenters, ...dynamicCenters];
  }, [dynamicCenters]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  // mapId is required for AdvancedMarkerElement
  // Create a Map ID in Google Cloud Console: https://console.cloud.google.com/google/maps-apis
  // Then add it to .env as: VITE_GOOGLE_MAPS_MAP_ID=your_map_id
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

  // Load Google Maps
  useEffect(() => {
    if (!apiKey) {
      console.error("Google Maps API Key not found! Please add VITE_GOOGLE_MAPS_API_KEY to .env");
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsMapLoaded(true);
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
      });
  }, [apiKey]);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.google || !window.google.maps) return;

    // Don't reinitialize if map already exists
    if (googleMapRef.current) {
      return;
    }

    // Wait a bit to ensure all Google Maps APIs are fully loaded
    const initMap = () => {
      const maps = window.google.maps;
      if (!maps || !maps.ControlPosition || !maps.MapTypeId) {
        // Retry after a short delay if APIs aren't ready
        setTimeout(initMap, 100);
        return;
      }

      // Check if marker library is loaded
      if (!maps.marker || !maps.marker.AdvancedMarkerElement) {
        console.warn("AdvancedMarkerElement not available, retrying...");
        setTimeout(initMap, 100);
        return;
      }

      const mapConfig: google.maps.MapOptions = {
        center: mapCenter,
        zoom: mapZoom,
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: maps.ControlPosition.TOP_RIGHT,
        },
        streetViewControl: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: maps.ControlPosition.RIGHT_TOP,
        },
        zoomControl: true,
        zoomControlOptions: {
          position: maps.ControlPosition.RIGHT_CENTER,
        },
        mapTypeId: maps.MapTypeId.ROADMAP,
        language: 'ar',
        region: 'SA',
      };

      // Add mapId if provided (required for AdvancedMarkerElement)
      if (mapId) {
        mapConfig.mapId = mapId;
        // Note: When mapId is present, styles cannot be set via code.
        // Styles must be configured in Google Cloud Console instead.
      } else {
        // Only add styles if mapId is not present
        mapConfig.styles = [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          }
        ];
        console.warn(
          '⚠️ VITE_GOOGLE_MAPS_MAP_ID not found. AdvancedMarkerElement requires a Map ID.\n' +
          'Create a Map ID at: https://console.cloud.google.com/google/maps-apis\n' +
          'Then add it to .env as: VITE_GOOGLE_MAPS_MAP_ID=your_map_id'
        );
      }

      try {
        const map = new maps.Map(mapRef.current!, mapConfig);
        
        // Wait for map to be fully initialized
        maps.event.addListenerOnce(map, 'idle', () => {
          googleMapRef.current = map;
        });
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    initMap();
  }, [isMapLoaded, mapId]);

  // Update map center and zoom
  useEffect(() => {
    if (!googleMapRef.current || !window.google?.maps) return;

    try {
      const map = googleMapRef.current;
      const mapDiv = map.getDiv();
      if (!mapDiv || mapDiv.offsetWidth === 0) {
        return;
      }

      map.setCenter(mapCenter);
      map.setZoom(mapZoom);
    } catch (error) {
      console.warn("Error updating map center/zoom:", error);
    }
  }, [mapCenter, mapZoom]);

  // Get unique cities
  const cities = useMemo(() => {
    return Array.from(new Set(medicalCenters.map((c) => c.city))).sort();
  }, []);

  // Filter centers based on search, city, and type
  const displayedCenters = useMemo(() => {
    let filtered = medicalCenters;

    // Filter by type
    if (selectedTab !== "all") {
      filtered = filtered.filter((c) => c.type === selectedTab);
    }

    // Filter by city
    if (selectedCity !== "all") {
      filtered = filtered.filter((c) => c.city === selectedCity);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.address.toLowerCase().includes(query) ||
          c.city.toLowerCase().includes(query) ||
          (c.specialties && c.specialties.some((s) => s.toLowerCase().includes(query)))
      );
    }

    // Sort by distance if user location is available
    if (userLocation) {
      filtered = [...filtered].sort((a, b) => {
        const distanceA = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          a.latitude,
          a.longitude
        );
        const distanceB = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          b.latitude,
          b.longitude
        );
        return distanceA - distanceB; // Sort from nearest to farthest
      });
    }

    return filtered;
  }, [medicalCenters, selectedTab, selectedCity, searchQuery, userLocation]);

  // Update map view when filters change (but don't auto-fit if user manually changed view)
  useEffect(() => {
    if (displayedCenters.length > 0 && googleMapRef.current) {
      // Only auto-update if there are filtered results
      const avgLat = displayedCenters.reduce((sum, c) => sum + c.latitude, 0) / displayedCenters.length;
      const avgLng = displayedCenters.reduce((sum, c) => sum + c.longitude, 0) / displayedCenters.length;
      
      // Update center and zoom smoothly
      if (googleMapRef.current) {
        try {
          googleMapRef.current.setCenter({ lat: avgLat, lng: avgLng });
          googleMapRef.current.setZoom(displayedCenters.length === 1 ? 13 : 8);
        } catch (error) {
          console.warn("Error updating map view:", error);
        }
      }
    }
  }, [displayedCenters]);

  // Update markers when centers or user location changes
  useEffect(() => {
    if (!googleMapRef.current || !window.google?.maps) return;

    // Check if map and marker library are ready
    const map = googleMapRef.current;
    const maps = window.google.maps;
    
    if (!maps.marker || !maps.marker.AdvancedMarkerElement) {
      console.warn("AdvancedMarkerElement not available yet");
      return;
    }

    const mapDiv = map.getDiv();
    if (!mapDiv || mapDiv.offsetWidth === 0) {
      // Map not ready yet, wait a bit
      const timeoutId = setTimeout(() => {
        if (googleMapRef.current && window.google?.maps) {
          // This will trigger the effect again
        }
      }, 200);
      return () => clearTimeout(timeoutId);
    }

    // Clear existing markers safely
    try {
      markersRef.current.forEach(marker => {
        try {
          if (marker && typeof marker.map !== 'undefined') {
            marker.map = null;
          }
        } catch (error) {
          console.warn("Error removing marker:", error);
        }
      });
      markersRef.current = [];
      
      infoWindowsRef.current.forEach(infoWindow => {
        try {
          if (infoWindow) {
            infoWindow.close();
          }
        } catch (error) {
          console.warn("Error closing info window:", error);
        }
      });
      infoWindowsRef.current = [];
    } catch (error) {
      console.warn("Error clearing markers:", error);
      // Reset refs even if there was an error
      markersRef.current = [];
      infoWindowsRef.current = [];
    }

    // Add user location marker
    if (userLocation) {
      try {
        // Remove existing user marker
        if (userMarkerRef.current) {
          try {
            if (userMarkerRef.current && typeof userMarkerRef.current.map !== 'undefined') {
              userMarkerRef.current.map = null;
            }
          } catch (error) {
            console.warn("Error removing user marker:", error);
          }
          userMarkerRef.current = null;
        }

        // Close existing info window
        if (userInfoWindowRef.current) {
          try {
            userInfoWindowRef.current.close();
          } catch (error) {
            console.warn("Error closing user info window:", error);
          }
          userInfoWindowRef.current = null;
        }

        // Create new marker
        const pinElement = new maps.marker.PinElement({
          background: '#10b981',
          borderColor: '#ffffff',
          glyphColor: '#ffffff',
          scale: 1.2,
        });

        const userMarker = new maps.marker.AdvancedMarkerElement({
          map: map,
          position: userLocation,
          content: pinElement.element,
          title: 'موقعك',
          zIndex: 1000,
        });

        const userInfoWindow = new maps.InfoWindow({
          content: '<div style="padding: 8px; text-align: center; direction: rtl;"><strong>موقعك</strong></div>',
        });

        userMarker.addListener('click', () => {
          try {
            if (userInfoWindowRef.current) {
              userInfoWindowRef.current.close();
            }
            userInfoWindow.open({
              anchor: userMarker,
              map: map,
            });
            userInfoWindowRef.current = userInfoWindow;
          } catch (error) {
            console.warn("Error opening user info window:", error);
          }
        });

        userMarkerRef.current = userMarker;
      } catch (error) {
        console.warn("Error creating user marker:", error);
      }
    }

    // Add center markers
    displayedCenters.forEach((center) => {
      try {
        const iconColor = center.type === 'hospital' ? '#ef4444' : '#3b82f6';
        
        const pinElement = new maps.marker.PinElement({
          background: iconColor,
          borderColor: '#ffffff',
          glyphColor: '#ffffff',
          scale: 1.0,
        });

        const marker = new maps.marker.AdvancedMarkerElement({
          map: map,
          position: { lat: center.latitude, lng: center.longitude },
          content: pinElement.element,
          title: center.name,
        });

      const distanceText = userLocation 
        ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; text-align: center;">
             <span style="color: #3b82f6; font-weight: bold; font-size: 12px;">
               📍 ${formatDistance(calculateDistance(userLocation.lat, userLocation.lng, center.latitude, center.longitude))}
             </span>
           </div>`
        : '';

        const infoWindow = new maps.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 220px; direction: rtl; text-align: right; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937; font-size: 16px;">${center.name}</h3>
              <div style="margin: 8px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <div style="margin-bottom: 6px;">
                  <span style="color: #3b82f6;">📍</span> ${center.address}
                </div>
                <div style="margin-bottom: 6px;">
                  <span style="color: #3b82f6;">🏙️</span> ${center.city}
                </div>
                <div style="margin-bottom: 6px;">
                  <span style="color: #3b82f6;">📞</span> 
                  <a href="tel:${center.phone}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">
                    ${center.phone}
                  </a>
                </div>
                ${distanceText}
              </div>
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${center.latitude},${center.longitude}${userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : ''}" 
                   target="_blank" 
                   style="display: inline-block; width: 100%; padding: 8px 12px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; text-align: center; transition: background 0.2s;"
                   onmouseover="this.style.background='#2563eb'"
                   onmouseout="this.style.background='#3b82f6'">
                  🗺️ فتح في Google Maps
                </a>
              </div>
            </div>
          `,
        });

        marker.addListener('click', () => {
          try {
            // Close all other info windows
            infoWindowsRef.current.forEach(iw => {
              try {
                if (iw) iw.close();
              } catch (error) {
                console.warn("Error closing info window:", error);
              }
            });
            
            // Close user info window if open
            if (userInfoWindowRef.current) {
              try {
                userInfoWindowRef.current.close();
              } catch (error) {
                console.warn("Error closing user info window:", error);
              }
            }
            
            infoWindow.open({
              anchor: marker,
              map: map,
            });
          } catch (error) {
            console.warn("Error opening info window:", error);
          }
        });

        markersRef.current.push(marker);
        infoWindowsRef.current.push(infoWindow);
      } catch (error) {
        console.warn(`Error creating marker for ${center.name}:`, error);
      }
    });

    // Fit bounds to show all markers
    if (displayedCenters.length > 0 || userLocation) {
      // Wait for map to be fully initialized
      if (!googleMapRef.current || !window.google?.maps) {
        return;
      }

      const fitBoundsSafely = () => {
        if (!googleMapRef.current || !window.google?.maps) {
          return;
        }

        try {
          const mapInstance = googleMapRef.current;
          
          // Check if map div is ready
          const mapDiv = mapInstance.getDiv();
          if (!mapDiv || mapDiv.offsetWidth === 0) {
            // Map not ready yet, wait for it
            const checkReady = () => {
              if (mapDiv && mapDiv.offsetWidth > 0 && googleMapRef.current) {
                try {
                  const bounds = new window.google.maps.LatLngBounds();
                  
                  if (userLocation) {
                    bounds.extend(userLocation);
                  }
                  
                  displayedCenters.forEach(center => {
                    bounds.extend({ lat: center.latitude, lng: center.longitude });
                  });

                  if (displayedCenters.length > 1 || (displayedCenters.length === 1 && userLocation)) {
                    googleMapRef.current.fitBounds(bounds);
                  }
                } catch (error) {
                  console.warn("Error fitting bounds:", error);
                }
              } else if (googleMapRef.current) {
                setTimeout(checkReady, 50);
              }
            };
            setTimeout(checkReady, 50);
            return;
          }

          // Map is ready, fit bounds
          const bounds = new window.google.maps.LatLngBounds();
          
          if (userLocation) {
            bounds.extend(userLocation);
          }
          
          displayedCenters.forEach(center => {
            bounds.extend({ lat: center.latitude, lng: center.longitude });
          });

          if (displayedCenters.length > 1 || (displayedCenters.length === 1 && userLocation)) {
            // Use idle event to ensure map is ready
            window.google.maps.event.addListenerOnce(mapInstance, 'idle', () => {
              try {
                mapInstance.fitBounds(bounds);
              } catch (error) {
                console.warn("Error fitting bounds after idle:", error);
              }
            });
            
            // Fallback: try immediately if idle doesn't fire
            setTimeout(() => {
              try {
                if (googleMapRef.current && mapDiv.offsetWidth > 0) {
                  googleMapRef.current.fitBounds(bounds);
                }
              } catch (error) {
                console.warn("Error fitting bounds in timeout:", error);
              }
            }, 300);
          }
        } catch (error) {
          console.warn("Error fitting bounds:", error);
        }
      };

      // Use setTimeout to ensure map is fully rendered
      setTimeout(fitBoundsSafely, 200);
    }

    // Cleanup function
    return () => {
      // Markers and info windows are cleaned up at the start of the effect
      // This cleanup is mainly for any pending timeouts
    };
  }, [displayedCenters, userLocation]);

  const handleLocationFound = (location: { lat: number; lng: number }) => {
    setUserLocation(location);
    
    // Find nearest center from all medical centers (not just displayed ones)
    const nearest = findNearestCenter(location.lat, location.lng, medicalCenters);
    setNearestCenter(nearest);
    
    if (nearest) {
      // Center map to show both user location and nearest center
      const centerLat = (location.lat + nearest.latitude) / 2;
      const centerLng = (location.lng + nearest.longitude) / 2;
      
      setMapCenter({ lat: centerLat, lng: centerLng });
      setMapZoom(11);
      
      // Scroll to nearest center card if it exists in displayed centers
      setTimeout(() => {
        const nearestCard = document.querySelector(`[data-center-id="${nearest.id}"]`);
        if (nearestCard) {
          nearestCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the card briefly
          nearestCard.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            nearestCard.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 2000);
        }
      }, 500);
    } else {
      // No centers found, just center on user location
      setMapCenter(location);
      setMapZoom(13);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    setIsLocating(true);
    
    // Use high accuracy for better results
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        handleLocationFound(location);
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsLocating(false);
        
        let errorMessage = "فشل في الحصول على الموقع.";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "تم رفض طلب الوصول للموقع. يرجى السماح بالوصول للموقع في إعدادات المتصفح.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "معلومات الموقع غير متاحة.";
            break;
          case error.TIMEOUT:
            errorMessage = "انتهت مهلة طلب الموقع.";
            break;
        }
        alert(errorMessage);
      },
      options
    );
  };

  const handleCenterClick = (center: MedicalCenter) => {
    setMapCenter({ lat: center.latitude, lng: center.longitude });
    setMapZoom(13);
    
    // Open info window for clicked center
    if (googleMapRef.current && window.google?.maps) {
      try {
        const marker = markersRef.current.find((m, index) => {
          const markerCenter = displayedCenters[index];
          return markerCenter && markerCenter.id === center.id;
        });
        
        if (marker) {
          const infoWindow = infoWindowsRef.current.find((iw, index) => {
            const markerCenter = displayedCenters[index];
            return markerCenter && markerCenter.id === center.id;
          });
          
          if (infoWindow) {
            // Close all other info windows
            infoWindowsRef.current.forEach(iw => {
              try {
                if (iw) iw.close();
              } catch (error) {
                console.warn("Error closing info window:", error);
              }
            });
            
            // Close user info window if open
            if (userInfoWindowRef.current) {
              try {
                userInfoWindowRef.current.close();
              } catch (error) {
                console.warn("Error closing user info window:", error);
              }
            }
            
            // Open the selected info window
            try {
              infoWindow.open({
                anchor: marker,
                map: googleMapRef.current,
              });
            } catch (error) {
              console.warn("Error opening info window:", error);
            }
          }
        }
      } catch (error) {
        console.warn("Error handling center click:", error);
      }
    }
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-primary/5 to-background" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              العيادات والمستشفيات المقترحة
            </h2>
          </div>
          <p className="text-xl text-muted-foreground font-body max-w-3xl mx-auto leading-relaxed">
            ابحثي عن أقرب مركز طبي متخصص في علاج سرطان الثدي واحصلي على معلومات الاتصال والعنوان
          </p>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <span>البحث والفلترة</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="ابحثي عن اسم المركز أو العنوان..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 h-12 text-base border-2 focus:border-primary/50 bg-background"
                    dir="rtl"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* City Filter */}
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <Map className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="h-12 text-base border-2 focus:border-primary/50 bg-background pr-10" dir="rtl">
                      <SelectValue placeholder="اختر المحافظة">
                        {selectedCity === "all" ? "جميع المحافظات" : selectedCity}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Map className="h-4 w-4 text-primary" />
                          <span className="font-semibold">جميع المحافظات</span>
                        </div>
                      </SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          <span className="font-medium">{city}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCity !== "all" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 z-10"
                      onClick={() => setSelectedCity("all")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Active Filters Badge */}
              {(searchQuery || selectedCity !== "all" || selectedTab !== "all") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t"
                >
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    الفلاتر النشطة:
                  </span>
                  {searchQuery && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      <span>البحث: "{searchQuery}"</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-primary/20"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {selectedCity !== "all" && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      <span>المحافظة: {selectedCity}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-primary/20"
                        onClick={() => setSelectedCity("all")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {selectedTab !== "all" && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      <span>النوع: {selectedTab === "hospital" ? "مستشفيات" : "عيادات"}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCity("all");
                      setSelectedTab("all");
                    }}
                    className="gap-2 text-sm"
                  >
                    <X className="h-4 w-4" />
                    إلغاء جميع الفلاتر
                  </Button>
                </motion.div>
              )}

              {/* Results Count */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>عدد النتائج:</span>
                    <span className="font-bold text-primary text-lg">{displayedCenters.length}</span>
                    <span>من {medicalCenters.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Nearest Center Card */}
        {nearestCenter && userLocation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-background shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Navigation className="h-5 w-5" />
                  أقرب مركز لك
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{nearestCenter.name}</h3>
                    <div className="space-y-2 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{nearestCenter.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${nearestCenter.phone}`} className="hover:text-primary transition-colors">
                          {nearestCenter.phone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          المسافة: {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, nearestCenter.latitude, nearestCenter.longitude))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleCenterClick(nearestCenter)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Map className="h-4 w-4 ml-2" />
                      عرض على الخريطة
                    </Button>
                    <Button
                      onClick={() => openGoogleMaps(nearestCenter, userLocation)}
                      variant="outline"
                      className="border-2 hover:bg-primary/10"
                    >
                      <ExternalLink className="h-4 w-4 ml-2" />
                      فتح في Google Maps
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Centers List */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span>قائمة المراكز</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "all" | "clinic" | "hospital")}>
                  <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                    <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      الكل
                    </TabsTrigger>
                    <TabsTrigger value="hospital" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Hospital className="h-4 w-4 ml-1" />
                      مستشفيات
                    </TabsTrigger>
                    <TabsTrigger value="clinic" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Stethoscope className="h-4 w-4 ml-1" />
                      عيادات
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4 space-y-3 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto">
                    {displayedCenters.length === 0 ? (
                      <div className="text-center py-12 space-y-4">
                        <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto">
                          <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-2">لا توجد نتائج</h3>
                          <p className="text-sm text-muted-foreground">جربي تغيير الفلاتر أو كلمة البحث</p>
                        </div>
                      </div>
                    ) : (
                      displayedCenters.map((center) => (
                        <motion.div
                          key={center.id}
                          data-center-id={center.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card 
                            className={`cursor-pointer hover:shadow-xl transition-all hover:border-primary/50 border-2 bg-gradient-to-br from-background to-primary/5 group ${
                              nearestCenter?.id === center.id ? 'ring-2 ring-primary ring-offset-2 border-primary' : ''
                            }`}
                            onClick={() => handleCenterClick(center)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start gap-3">
                                <div className={`p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform ${center.type === "hospital" ? "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/20" : "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/20"}`}>
                                  {center.type === "hospital" ? (
                                    <Hospital className={`h-6 w-6 ${center.type === "hospital" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                                  ) : (
                                    <Stethoscope className={`h-6 w-6 ${center.type === "hospital" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">{center.name}</h3>
                                  <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary/70" />
                                      <span className="line-clamp-2">{center.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 flex-shrink-0 text-primary/70" />
                                      <a 
                                        href={`tel:${center.phone}`}
                                        className="hover:text-primary transition-colors font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {center.phone}
                                      </a>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                      <div className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-semibold">
                                        {center.city}
                                      </div>
                                    </div>
                                    {userLocation && (
                                      <div className="flex items-center gap-2 pt-1">
                                        <Navigation className="h-3.5 w-3.5 text-primary/70" />
                                        <span className="text-xs font-semibold text-primary">
                                          {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, center.latitude, center.longitude))}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </TabsContent>
                  
                  <TabsContent value="hospital" className="mt-4 space-y-3 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto">
                    {displayedCenters.length === 0 ? (
                      <div className="text-center py-12 space-y-4">
                        <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto">
                          <Hospital className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-2">لا توجد مستشفيات</h3>
                          <p className="text-sm text-muted-foreground">جربي تغيير الفلاتر أو كلمة البحث</p>
                        </div>
                      </div>
                    ) : (
                      displayedCenters.map((center) => (
                        <motion.div
                          key={center.id}
                          data-center-id={center.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card 
                            className={`cursor-pointer hover:shadow-xl transition-all hover:border-primary/50 border-2 bg-gradient-to-br from-background to-primary/5 group ${
                              nearestCenter?.id === center.id ? 'ring-2 ring-primary ring-offset-2 border-primary' : ''
                            }`}
                            onClick={() => handleCenterClick(center)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start gap-3">
                                <div className={`p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform ${center.type === "hospital" ? "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/20" : "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/20"}`}>
                                  {center.type === "hospital" ? (
                                    <Hospital className={`h-6 w-6 ${center.type === "hospital" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                                  ) : (
                                    <Stethoscope className={`h-6 w-6 ${center.type === "hospital" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">{center.name}</h3>
                                  <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary/70" />
                                      <span className="line-clamp-2">{center.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 flex-shrink-0 text-primary/70" />
                                      <a 
                                        href={`tel:${center.phone}`}
                                        className="hover:text-primary transition-colors font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {center.phone}
                                      </a>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                      <div className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-semibold">
                                        {center.city}
                                      </div>
                                    </div>
                                    {userLocation && (
                                      <div className="flex items-center gap-2 pt-1">
                                        <Navigation className="h-3.5 w-3.5 text-primary/70" />
                                        <span className="text-xs font-semibold text-primary">
                                          {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, center.latitude, center.longitude))}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </TabsContent>
                  
                  <TabsContent value="clinic" className="mt-4 space-y-3 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto">
                    {displayedCenters.length === 0 ? (
                      <div className="text-center py-12 space-y-4">
                        <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto">
                          <Stethoscope className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-2">لا توجد عيادات</h3>
                          <p className="text-sm text-muted-foreground">جربي تغيير الفلاتر أو كلمة البحث</p>
                        </div>
                      </div>
                    ) : (
                      displayedCenters.map((center) => (
                        <motion.div
                          key={center.id}
                          data-center-id={center.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card 
                            className={`cursor-pointer hover:shadow-xl transition-all hover:border-primary/50 border-2 bg-gradient-to-br from-background to-primary/5 group ${
                              nearestCenter?.id === center.id ? 'ring-2 ring-primary ring-offset-2 border-primary' : ''
                            }`}
                            onClick={() => handleCenterClick(center)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start gap-3">
                                <div className={`p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform ${center.type === "hospital" ? "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/20" : "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/20"}`}>
                                  {center.type === "hospital" ? (
                                    <Hospital className={`h-6 w-6 ${center.type === "hospital" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                                  ) : (
                                    <Stethoscope className={`h-6 w-6 ${center.type === "hospital" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">{center.name}</h3>
                                  <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary/70" />
                                      <span className="line-clamp-2">{center.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 flex-shrink-0 text-primary/70" />
                                      <a 
                                        href={`tel:${center.phone}`}
                                        className="hover:text-primary transition-colors font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {center.phone}
                                      </a>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                      <div className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-semibold">
                                        {center.city}
                                      </div>
                                    </div>
                                    {userLocation && (
                                      <div className="flex items-center gap-2 pt-1">
                                        <Navigation className="h-3.5 w-3.5 text-primary/70" />
                                        <span className="text-xs font-semibold text-primary">
                                          {formatDistance(calculateDistance(userLocation.lat, userLocation.lng, center.latitude, center.longitude))}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-2 shadow-xl">
              <div className="relative h-[400px] sm:h-[500px] md:h-[600px] w-full">
                {!apiKey ? (
                  <div className="flex items-center justify-center h-full bg-muted">
                    <div className="text-center p-6">
                      <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">يرجى إضافة VITE_GOOGLE_MAPS_API_KEY في ملف .env</p>
                    </div>
                  </div>
                ) : !isMapLoaded ? (
                  <div className="flex items-center justify-center h-full bg-muted">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">جاري تحميل الخريطة...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div ref={mapRef} className="w-full h-full" />
                    {/* Locate Button */}
                    <div className="absolute top-3 left-3 sm:top-6 sm:left-6 z-[1000]">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={handleGetLocation}
                          disabled={isLocating}
                          className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-2xl border-2 border-white/20 backdrop-blur-sm font-semibold text-sm sm:text-base h-11 sm:h-12 px-3 sm:px-5 gap-2 hover:shadow-primary/50 transition-all duration-300"
                          size="lg"
                        >
                          {isLocating ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>جاري تحديد الموقع...</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="h-5 w-5" />
                              <span>تحديد موقعي</span>
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
