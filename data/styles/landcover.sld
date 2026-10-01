<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:sld="http://www.opengis.net/sld" version="1.0.0">
  <UserLayer>
    <sld:LayerFeatureConstraints>
      <sld:FeatureTypeConstraint/>
    </sld:LayerFeatureConstraints>
    <sld:UserStyle>
      <sld:Name>chefchaouen_landcover_2025</sld:Name>
      <sld:FeatureTypeStyle>
        <sld:Rule>
          <sld:RasterSymbolizer>
            <sld:ChannelSelection>
              <sld:GrayChannel>
                <sld:SourceChannelName>1</sld:SourceChannelName>
              </sld:GrayChannel>
            </sld:ChannelSelection>
            <sld:ColorMap type="values">
              <sld:ColorMapEntry label="Forest" color="#1b7837" quantity="1"/>
              <sld:ColorMapEntry label="Shrubland/grassland" color="#a6d96a" quantity="2"/>
              <sld:ColorMapEntry label="Cropland" color="#fee08b" quantity="3"/>
              <sld:ColorMapEntry label="Built-up" color="#d73027" quantity="4"/>
              <sld:ColorMapEntry label="Bare/sparse" color="#bdbdbd" quantity="5"/>
              <sld:ColorMapEntry label="Water" color="#4575b4" quantity="6"/>
            </sld:ColorMap>
          </sld:RasterSymbolizer>
        </sld:Rule>
      </sld:FeatureTypeStyle>
    </sld:UserStyle>
  </UserLayer>
</StyledLayerDescriptor>
