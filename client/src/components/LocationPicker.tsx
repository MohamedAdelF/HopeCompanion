import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Declare Google Maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; city?: string }) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
}

export function LocationPicker({ onLocationSelect, initialLat, initialLng, initialAddress }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const autocompleteInstanceRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialAddress || "");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address: string; city?: string } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng, address: initialAddress || "" } : null
  );
  const [isLoading, setIsLoading] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) {
      console.error("Google Maps API Key not found!");
      return;
    }

    const loadGoogleMapsScript = (): Promise<void> => {
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

    loadGoogleMapsScript()
      .then(() => setIsMapLoaded(true))
      .catch((error) => console.error("Error loading Google Maps:", error));
  }, [apiKey]);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.google || !window.google.maps) return;

    const initMap = () => {
      const maps = window.google.maps;
      if (!maps || !maps.ControlPosition || !maps.MapTypeId) {
        setTimeout(initMap, 100);
        return;
      }

      const center = selectedLocation || { lat: 30.0444, lng: 31.2357 }; // Default: Cairo

      const mapConfig: google.maps.MapOptions = {
        center,
        zoom: selectedLocation ? 15 : 6,
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: maps.ControlPosition.TOP_RIGHT,
        },
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        mapTypeId: maps.MapTypeId.ROADMAP,
        language: 'ar',
        region: 'SA',
      };

      if (mapId) {
        mapConfig.mapId = mapId;
      }

      const map = new maps.Map(mapRef.current!, mapConfig);
      googleMapRef.current = map;

      // Add click listener to map
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          
          // Reverse geocode to get address
          setIsLoading(true);
          const geocoder = new maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            setIsLoading(false);
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              const city = results[0].address_components.find(
                (component) => component.types.includes('administrative_area_level_1')
              )?.long_name || '';
              
              const location = { lat, lng, address, city };
              setSelectedLocation(location);
              updateMarker(lat, lng);
            } else {
              const location = { lat, lng, address: `${lat}, ${lng}` };
              setSelectedLocation(location);
              updateMarker(lat, lng);
            }
          });
        }
      });

      // Initialize marker if location exists
      if (selectedLocation) {
        updateMarker(selectedLocation.lat, selectedLocation.lng);
      }
    };

    initMap();
  }, [isMapLoaded, mapId]);

  // Update marker position
  const updateMarker = (lat: number, lng: number) => {
    if (!googleMapRef.current || !window.google?.maps?.marker) return;

    const maps = window.google.maps;
    
    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.map = null;
    }

    // Create new marker
    const pinElement = new maps.marker.PinElement({
      background: '#3b82f6',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      scale: 1.2,
    });

    const marker = new maps.marker.AdvancedMarkerElement({
      map: googleMapRef.current,
      position: { lat, lng },
      content: pinElement.element,
    });

    markerRef.current = marker;

    // Center map on marker
    googleMapRef.current.setCenter({ lat, lng });
    googleMapRef.current.setZoom(15);
  };

  // Initialize Places Autocomplete
  useEffect(() => {
    if (!isMapLoaded || !autocompleteRef.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(autocompleteRef.current, {
      componentRestrictions: { country: 'eg' }, // Restrict to Egypt
      fields: ['geometry', 'formatted_address', 'address_components'],
      language: 'ar',
    });

    autocompleteInstanceRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || searchQuery;
        const city = place.address_components?.find(
          (component) => component.types.includes('administrative_area_level_1')
        )?.long_name || '';

        const location = { lat, lng, address, city };
        setSelectedLocation(location);
        setSearchQuery(address);
        updateMarker(lat, lng);
      }
    });

    return () => {
      if (autocompleteInstanceRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteInstanceRef.current);
      }
    };
  }, [isMapLoaded, searchQuery]);

  // Handle confirm button
  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
    }
  };

  if (!apiKey) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Google Maps API Key غير موجود</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          ابحث عن الموقع أو انقر على الخريطة
        </label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60 z-10" />
          <Input
            ref={autocompleteRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن العنوان (مثال: القاهرة، مصر الجديدة...)"
            className="pr-11 h-12"
          />
        </div>
      </div>

      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-[400px] rounded-lg border-2 border-border overflow-hidden"
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {selectedLocation && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-semibold">الموقع المحدد:</span>
          </div>
          <p className="text-sm text-muted-foreground">{selectedLocation.address}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-semibold">خط العرض:</span> {selectedLocation.lat.toFixed(6)}
            </div>
            <div>
              <span className="font-semibold">خط الطول:</span> {selectedLocation.lng.toFixed(6)}
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={handleConfirm}
        disabled={!selectedLocation}
        className="w-full"
      >
        تأكيد الموقع
      </Button>
    </div>
  );
}

