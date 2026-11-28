import { Config } from '@remotion/cli/config';

// JPEG frames are fast; the encoder settings give a clean BT.709 master.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setCodec('h264');
Config.setCrf(16);
