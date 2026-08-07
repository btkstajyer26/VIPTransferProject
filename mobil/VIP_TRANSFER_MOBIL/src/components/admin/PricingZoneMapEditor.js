import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const DEFAULT_CENTER = [41.0082, 28.9784];

function getInitialPoints(polygon) {
  const ring = polygon?.type === 'Polygon' ? polygon.coordinates?.[0] : null;
  if (!Array.isArray(ring) || ring.length < 2) return [];
  const points = ring.map((point) => [Number(point?.[0]), Number(point?.[1])])
    .filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude));
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) points.pop();
  }
  return points;
}

function serialize(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildHtml(initialPolygon, isDark) {
  const initialPoints = getInitialPoints(initialPolygon);
  const center = initialPoints.length ? [initialPoints[0][1], initialPoints[0][0]] : DEFAULT_CENTER;
  const background = isDark ? '#0b1729' : '#eef3f8';
  const panel = isDark ? '#10243d' : '#ffffff';
  const text = isDark ? '#f8fafc' : '#0f172a';

  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
html,body,#map{height:100%;width:100%;margin:0;background:${background}} .leaflet-container{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.toolbar{position:absolute;z-index:500;top:10px;right:10px;display:flex;gap:7px}.tool{border:1px solid rgba(148,163,184,.55);border-radius:9px;padding:9px 11px;background:${panel};color:${text};font-size:13px;font-weight:700;box-shadow:0 2px 8px rgba(15,23,42,.2)}
.count{position:absolute;z-index:500;left:10px;bottom:10px;border-radius:9px;padding:8px 10px;background:${panel};color:${text};font-size:12px;box-shadow:0 2px 8px rgba(15,23,42,.2)}
</style></head><body><div id="map"></div><div class="toolbar"><button class="tool" id="undo">Geri al</button><button class="tool" id="clear">Temizle</button></div><div class="count" id="count"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
(function(){
  var points=${serialize(initialPoints)}, markers=[], polygon=null;
  var map=L.map('map',{zoomControl:true,attributionControl:true}).setView(${serialize(center)}, points.length ? 12 : 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  function send(){
    var coordinates=points.length>=3 ? [[].concat(points,[points[0]])] : null;
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'polygonChange',coordinates:coordinates,pointCount:points.length}));
  }
  function render(shouldSend){
    markers.forEach(function(marker){map.removeLayer(marker)}); markers=[];
    if(polygon){map.removeLayer(polygon);polygon=null}
    points.forEach(function(point,index){
      var marker=L.circleMarker([point[1],point[0]],{radius:8,color:'#d4af37',fillColor:'#f5d76e',fillOpacity:1,weight:3}).addTo(map);
      marker.bindTooltip('Nokta '+(index+1)); marker.on('click',function(e){L.DomEvent.stopPropagation(e);points.splice(index,1);render(true)}); markers.push(marker);
    });
    if(points.length>=3){polygon=L.polygon(points.map(function(p){return [p[1],p[0]]}),{color:'#d4af37',fillColor:'#d4af37',fillOpacity:.28,weight:3}).addTo(map)}
    document.getElementById('count').textContent=points.length+' nokta · Silmek için noktaya dokunun';
    if(shouldSend)send();
  }
  map.on('click',function(e){points.push([Number(e.latlng.lng.toFixed(7)),Number(e.latlng.lat.toFixed(7))]);render(true)});
  document.getElementById('undo').onclick=function(){if(points.length){points.pop();render(true)}};
  document.getElementById('clear').onclick=function(){points=[];render(true)};
  render(false);
  if(points.length>=3){map.fitBounds(points.map(function(p){return [p[1],p[0]]}),{padding:[28,28]})}
})();</script></body></html>`;
}

export default function PricingZoneMapEditor({ initialPolygon, onChange, theme }) {
  const htmlRef = useRef(buildHtml(initialPolygon, theme.mode === 'dark'));
  const [mapError, setMapError] = useState(false);

  function handleMessage(event) {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message?.type !== 'polygonChange') return;
      onChange(message.coordinates ? { type: 'Polygon', coordinates: message.coordinates } : null);
    } catch {
      // Geçersiz WebView mesajı form akışını etkilemez.
    }
  }

  return (
    <View style={[styles.frame, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <WebView
        javaScriptEnabled
        onError={() => setMapError(true)}
        onMessage={handleMessage}
        originWhitelist={['*']}
        source={{ html: htmlRef.current }}
        style={styles.webView}
      />
      {mapError ? (
        <View style={[styles.errorOverlay, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.error }}>Harita yüklenemedi. GeoJSON alanını kullanabilirsiniz.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 360, overflow: 'hidden', borderWidth: 1, borderRadius: 18 },
  webView: { flex: 1, backgroundColor: 'transparent' },
  errorOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
});

