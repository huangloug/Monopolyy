# Tiled TMX Parser

Loads tmx and tsx files created by the Tiled Map Editor.
Works with both embedded and referenced tilesets.

https://www.mapeditor.org/

## Examples

### Load by URI

    import {parse} from 'tiled-tmx-parser';
    
    async function loadMap() {
        // Must be an absolute uri
        const map = await parse('http://{YOUR_SITE}/my-map.tmx');
    }

### Load by path

    import {parse} from 'tiled-tmx-parser';
    
    async function loadMap() {
        // Must be an absolute uri
        const map = await parse(path.join(__dirname, './maps/my-map.tmx');
    }

### API

    import {parse} from 'tiled-tmx-parser';
    
    async function loadMap() {
        // Must be an absolute uri
        const map = await parse(path.join(__dirname, './maps/my-map.tmx');
        const tileLayer = map.layers.find(x => x instanceof TileLayer) // as TileLayer;
        const firstTile = tileLayer.tileAt(0, 0);
        const firstObject = map.getObjectById(1);
        const firstTileInTileSet = map.getTileById(1);
        const firstTileSet = map.getTileSetByGid(1);
    }

## Options

|Key|Description|DefaultValue|
|---|---|---|
|transformObjectProperties|Whether or not to transform "object" custom properties into a reference of the object. If set to false, a number is used as the custom property.|true|

## Notes

* Does not support Base64 ZStandard compression
* Does not support "Output Chunk Width/Height"
* Does not currently support Group Layer
