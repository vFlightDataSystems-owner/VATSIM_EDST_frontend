import type { GeoJSON } from "react-leaflet";
import { Marker, Polyline, useMap } from "react-leaflet";
import React, { useEffect, useRef, useState, useMemo, useLayoutEffect } from "react";
import type { Position } from "@turf/turf";
import L from "leaflet";
import { useBoolean } from "usehooks-ts";
import type { Nullable } from "types/utility-types";
import { entrySelector } from "~redux/slices/entrySlice";
import { aircraftTrackSelector } from "~redux/slices/trackSlice";
import type { AirwayFix } from "types/airwayFix";
import type { RouteFix } from "types/routeFix";
import { useRouteFixes } from "api/aircraftApi";
import type { ApiLocation } from "types/apiTypes/apiLocation";
import { locationToPosition } from "~/utils/locationToPosition";
import { getRemainingFixesFromPpos } from "~/utils/fixes";
import { useRootSelector } from "~redux/hooks";
import { colors } from "~/colors";
import { GpdDataBlock } from "components/GpdDataBlock";
import { fixIcon, trackIcon, vorIcon } from "components/LeafletIcons";
import "leaflet.vectorgrid";
import { GPD_MAX_ZOOM } from "~redux/slices/gpdSlice";

function posToLatLng(pos: Position | { lat: number | string; lon: number | string }): L.LatLngExpression {
  if (Array.isArray(pos)) {
    return { lat: pos[1], lng: pos[0] };
  }
  return { lat: Number(pos.lat), lng: Number(pos.lon) };
}

function locationToLatLng(location: ApiLocation) {
  return posToLatLng(locationToPosition(location));
}

type GpdFixProps = ApiLocation;

export const GpdNavaid = (location: GpdFixProps) => {
  const posLatLng = locationToLatLng(location);
  return <Marker position={posLatLng} icon={vorIcon} />;
};

export const GpdFix = ({ lat, lon }: GpdFixProps) => {
  const posLatLng = posToLatLng([Number(lon), Number(lat)]);
  return <Marker position={posLatLng} icon={fixIcon} />;
};

export type GpdAirwayPolylineProps = { segments: AirwayFix[] };

export const GpdAirwayPolyline = ({ segments }: GpdAirwayPolylineProps) => {
  return (
    <Polyline
      positions={segments
        .sort((u, v) => Number(u.sequence) - Number(v.sequence))
        .map((segment) => posToLatLng({ lat: segment.lat, lon: segment.lon }))}
      pathOptions={{ color: colors.grey, weight: 0.4 }}
    />
  );
};

export type DataBlockOffset = { x: number; y: number };

const slicedOptions = {
  // vector grid options
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  rendererFactory: L.canvas.tile,
  interactive: false,
  vectorTileLayerStyles: {
    sliced: {
      fill: false,
      weight: 1.6,
      fillColor: "#000000",
      color: "#adadad",
      fillOpacity: 0,
      opacity: 1,
    },
  },
  // slicer options
  vectorTileLayerName: "sliced",
  // geojson-vt options.
  maxZoom: GPD_MAX_ZOOM, // max zoom to preserve detail on; can't be higher than 24
  tolerance: 3, // simplification tolerance (higher means simpler)
  extent: 8192, // tile extent (both width and height)
  buffer: 256, // tile buffer on each side
  debug: 0, // logging level (0 to disable, 1 or 2)
  lineMetrics: false, // whether to enable line metrics tracking for LineString/MultiLineString features
  promoteId: null, // name of a feature property to promote to feature.id. Cannot be used with `generateId`
  generateId: false, // whether to generate feature ids. Cannot be used with `promoteId`
  indexMaxZoom: GPD_MAX_ZOOM, // max zoom in the initial tile index
  indexMaxPoints: 1000, // max number of points per tile in the index
};

type GpdPolygonProps = { data: GeoJSON.FeatureCollection };

export const GpdPolygon = ({ data }: GpdPolygonProps) => {
  const map = useMap();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const slicerVectorGrid = useMemo(() => L.vectorGrid.slicer(data, slicedOptions), [data]);

  // add vectorGrid to map
  useLayoutEffect(() => {
    map.addLayer(slicerVectorGrid);
    return () => {
      map.removeLayer(slicerVectorGrid);
    };
  }, [map, slicerVectorGrid]);

  return null;
};

type GpdAircraftTrackProps = { aircraftId: string };

export const GpdAircraftTrack = ({ aircraftId }: GpdAircraftTrackProps) => {
  const entry = useRootSelector((state) => entrySelector(state, aircraftId));
  const track = useRootSelector((state) => aircraftTrackSelector(state, aircraftId));
  const [routeLine, setRouteLine] = useState<RouteFix[] | null>(null);
  const posLatLng = useMemo(() => (track?.location ? posToLatLng({ ...track.location }) : null), [track.location]);
  const { value: showRoute, toggle: toggleShowRoute } = useBoolean(false);
  const { value: showDataBlock, toggle: toggleShowDataBlock } = useBoolean(true);
  const ref = useRef<Nullable<L.Marker>>(null);
  const routeFixes = useRouteFixes(aircraftId);
  const [datablockOffset, setDatablockOffset] = useState({ x: 24, y: -30 });

  // updates route line
  useEffect(() => {
    if (showRoute) {
      setRouteLine(track ? getRemainingFixesFromPpos(routeFixes, locationToPosition(track.location)) : null);
    }
  }, [posLatLng, routeFixes, showRoute, track]);

  return posLatLng ? (
    <>
      <Marker
        position={posLatLng}
        icon={trackIcon}
        opacity={1}
        ref={ref}
        riseOnHover
        eventHandlers={{
          mousedown: (event) => {
            event.originalEvent.button === 1 && toggleShowRoute();
            event.originalEvent.button === 2 && toggleShowDataBlock();
          },
        }}
      >
        {showDataBlock && entry && (
          <GpdDataBlock aircraftId={aircraftId} offset={datablockOffset} setOffset={setDatablockOffset} toggleShowRoute={toggleShowRoute} />
        )}
      </Marker>
      {showRoute && routeLine && (
        <Polyline positions={routeLine.map((fix) => posToLatLng(fix.pos))} pathOptions={{ color: colors.green, weight: 1.1 }} />
      )}
    </>
  ) : null;
};

// TODO: give this component a better name...
export const GpdPlanDisplay = ({ displayData }: { displayData: Record<string, unknown>[] }) => {
  // TODO: implement component

  return <>{displayData.map(() => null)}</>;
};