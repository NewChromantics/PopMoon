Pop.Include = function(Filename)
{
	let Source = Pop.LoadFileAsString(Filename);
	return Pop.CompileAndRun( Source, Filename );
}

//	auto setup global
function SetGlobal()
{
	Pop.Global = this;
	Pop.Debug(Pop.Global);
}
SetGlobal.call(this);

const Earth = Pop.GetExeArguments().Earth;
const EnableImages = Pop.GetExeArguments().EnableImages!==false;
//const EnableImages = false;

const Geo_Colour_Shader = RegisterShaderAssetFilename('Colour.frag.glsl','Geo.vert.glsl');

Pop.AsyncCacheAssetAsString('Colour.frag.glsl');
Pop.AsyncCacheAssetAsString('Geo.vert.glsl');



var Params = {};
function OnParamsChanged()
{
	
}
Params.SquareStep = true;
Params.DrawColour = true;
Params.DrawHeight = false;
Params.DrawStepHeat = false;
Params.DrawUv = false;
Params.ApplyAmbientOcclusionColour = true;
Params.ApplyHeightColour = false;
Params.AmbientOcclusionMin = 0.21;
Params.AmbientOcclusionMax = 0.66;
Params.TextureSampleColourMult = 1.41;
Params.TextureSampleColourAdd = 0.1;
Params.BaseColour = [0.91,0.85,0.75];
Params.BackgroundColour = [0,0.5,1];
Params.TerrainHeightScalar = 0.074;
Params.Fov = 52;
Params.BrightnessMult = 1.8;
Params.HeightMapStepBack = 0.5;//0.30;
Params.MoonSphere = [0,0,-2,1];
Params.DebugClearEyes = false;
Params.XrToMouseScale = 100;	//	metres to pixels

const ParamsWindowRect = [800,20,350,200];
var ParamsWindow = new CreateParamsWindow(Params,OnParamsChanged,ParamsWindowRect);
ParamsWindow.AddParam('SquareStep');
ParamsWindow.AddParam('DrawColour');
ParamsWindow.AddParam('DrawHeight');
ParamsWindow.AddParam('DrawStepHeat');
ParamsWindow.AddParam('DrawUv');
ParamsWindow.AddParam('TextureSampleColourMult',0,2);
ParamsWindow.AddParam('TextureSampleColourAdd',-1,1);
ParamsWindow.AddParam('ApplyAmbientOcclusionColour');
ParamsWindow.AddParam('AmbientOcclusionMin',0,1);
ParamsWindow.AddParam('AmbientOcclusionMax',0,1);
ParamsWindow.AddParam('ApplyHeightColour');
ParamsWindow.AddParam('BaseColour','Colour');
ParamsWindow.AddParam('BackgroundColour','Colour');
ParamsWindow.AddParam('TerrainHeightScalar',0,5);
ParamsWindow.AddParam('Fov',10,90);
ParamsWindow.AddParam('BrightnessMult',0,10);
ParamsWindow.AddParam('HeightMapStepBack',0,1);


class TMoonApp
{
	constructor()
	{
		this.Camera = new Pop.Camera();
		this.Camera.LookAt = Params.MoonSphere.slice();
		this.Camera.Position[2] = this.Camera.LookAt[2] + 4;
		//this.Camera.LookAt = [71.5,-5,-30.3];
		//this.Camera.Position = [69.8,3.35,-48.7];

	}
}


const RandomNumberCache = [];

function GetRandomNumberArray(Count)
{
	if ( RandomNumberCache.length < Count )
		Pop.Debug("calculating random numbers x"+Count);
	while ( RandomNumberCache.length < Count )
	{
		RandomNumberCache.push( Math.random() );
	}
	return RandomNumberCache;
}


function CreateRandomSphereImage(Width,Height)
{
	let Channels = 4;
	let Format = 'Float4';
	
	const TimerStart = Pop.GetTimeNowMs();
	
	let Pixels = new Float32Array( Width * Height * Channels );
	const Rands = GetRandomNumberArray(Pixels.length*Channels);
	for ( let i=0;	i<Pixels.length;	i+=Channels )
	{
		let xyz = Rands.slice( i*Channels, (i*Channels)+Channels );
		let w = xyz[3];
		xyz = Math.Subtract3( xyz, [0.5,0.5,0.5] );
		xyz = Math.Normalise3( xyz );
		xyz = Math.Add3( xyz, [1,1,1] );
		xyz = Math.Multiply3( xyz, [0.5,0.5,0.5] );
		
		Pixels[i+0] = xyz[0];
		Pixels[i+1] = xyz[1];
		Pixels[i+2] = xyz[2];
		Pixels[i+3] = w;
	}
	
	Pop.Debug("CreateRandomSphereImage() took", Pop.GetTimeNowMs() - TimerStart);
	
	let Texture = new Pop.Image();
	Texture.WritePixels( Width, Height, Pixels, Format );
	return Texture;
}


Pop.CreateColourTexture = function(Colour4)
{
	let NewTexture = new Pop.Image();
	if ( Array.isArray(Colour4) )
		Colour4 = new Float32Array(Colour4);
	NewTexture.WritePixels( 1, 1, Colour4, 'Float4' );
	return NewTexture;
}


AssetFetchFunctions['Cube'] = CreateCubeGeometry;

function CreateCubeGeometry(RenderTarget,Min=-1,Max=1)
{
	let VertexSize = 3;
	let VertexData = [];
	let TriangleIndexes = [];
	
	let AddTriangle = function(a,b,c)
	{
		let FirstTriangleIndex = VertexData.length / VertexSize;
		
		a.forEach( v => VertexData.push(v) );
		b.forEach( v => VertexData.push(v) );
		c.forEach( v => VertexData.push(v) );
		
		TriangleIndexes.push( FirstTriangleIndex+0 );
		TriangleIndexes.push( FirstTriangleIndex+1 );
		TriangleIndexes.push( FirstTriangleIndex+2 );
	}
	
	let tln = [Min,Min,Min];
	let trn = [Max,Min,Min];
	let brn = [Max,Max,Min];
	let bln = [Min,Max,Min];
	let tlf = [Min,Min,Max];
	let trf = [Max,Min,Max];
	let brf = [Max,Max,Max];
	let blf = [Min,Max,Max];
	
	
	//	near
	AddTriangle( tln, trn, brn );
	AddTriangle( brn, bln, tln );
	//	far
	AddTriangle( trf, tlf, blf );
	AddTriangle( blf, brf, trf );
	
	//	top
	AddTriangle( tln, tlf, trf );
	AddTriangle( trf, trn, tln );
	//	bottom
	AddTriangle( bln, blf, brf );
	AddTriangle( brf, brn, bln );
	
	//	left
	AddTriangle( tlf, tln, bln );
	AddTriangle( bln, blf, tlf );
	//	right
	AddTriangle( trn, trf, brf );
	AddTriangle( brf, brn, trn );
	
	const VertexAttributeName = "LocalPosition";
	
	//	loads much faster as a typed array
	VertexData = new Float32Array( VertexData );
	TriangleIndexes = new Int32Array(TriangleIndexes);
	
	//	emulate webgl on desktop
	TriangleIndexes = undefined;
	
	let TriangleBuffer = new Pop.Opengl.TriangleBuffer( RenderTarget, VertexAttributeName, VertexData, VertexSize, TriangleIndexes );
	return TriangleBuffer;
}





const MoonApp = new TMoonApp();


let MoonColourTexture = Pop.CreateColourTexture([0.1,0.8,0.8,1]);
let MoonDepthTexture = Pop.CreateColourTexture([0,0,0,1]);

async function LoadAssets()
{
	//	start loads together
	const DepthPromise = Pop.LoadFileAsImageAsync(HeightmapFilename);
	const ColourPromise = Pop.LoadFileAsImageAsync(ColourFilename);

	//	set new textures
	MoonDepthTexture = await DepthPromise;
	MoonDepthTexture.SetLinearFilter(true);
	MoonColourTexture = await ColourPromise;
	MoonColourTexture.SetLinearFilter(true);
}
LoadAssets();


class Actor
{
	constructor(Geometry,Shader,Colour=[0.7,0.9,0.1])
	{
		this.Geometry = Geometry;
		this.Shader = Shader;
		this.Uniforms = {};
		this.Uniforms.Colour = Colour;
		this.Position = [0,0,0];
	}
}

function RenderActor(RenderTarget,Camera,Actor)
{
	const RenderContext = RenderTarget.GetRenderContext();
	const Geometry = GetAsset(Actor.Geometry,RenderContext);
	const Shader = GetAsset(Actor.Shader,RenderContext);
	
	const WorldToCameraMatrix = Camera.GetWorldToCameraMatrix();
	const CameraProjectionMatrix = Camera.GetProjectionMatrix( RenderTarget.GetRenderTargetRect() );
	const ScreenToCameraTransform = Math.MatrixInverse4x4( CameraProjectionMatrix );
	const CameraToWorldTransform = Math.MatrixInverse4x4( WorldToCameraMatrix );
	
	const LocalToWorldTransform = Math.CreateTranslationMatrix(Actor.Position);
	
	const SetUniforms = function(Shader)
	{
		Shader.SetUniform('CameraProjectionTransform',CameraProjectionMatrix);
		Shader.SetUniform('LocalToWorldTransform',LocalToWorldTransform);
		Shader.SetUniform('WorldToCameraTransform',WorldToCameraMatrix);
		
		function SetUniform(Key)
		{
			Shader.SetUniform( Key, this[Key] );
		}
		Object.keys(Params).forEach(SetUniform.bind(Params));
		Object.keys(Actor.Uniforms).forEach(SetUniform.bind(Actor.Uniforms));
	}
	//RenderTarget.SetBlendModeAlpha();
	RenderTarget.DrawGeometry( Geometry, Shader, SetUniforms );
}
	
	
function Render(RenderTarget,Camera)
{
	if ( !Params.DebugClearEyes )
		RenderTarget.ClearColour( ...Params.BackgroundColour );
	else if ( Camera.Name == 'left' )
		RenderTarget.ClearColour( 0,0.5,1 );
	else if (Camera.Name == 'right')
		RenderTarget.ClearColour(1, 0, 0);
	else if (Camera.Name == 'none')
		RenderTarget.ClearColour(0, 1, 0);
	else
		RenderTarget.ClearColour( 1,0,1 );
	
	
	const Cube = new Actor('Cube',Geo_Colour_Shader);
	RenderActor(RenderTarget,Camrea,Cube);
}


//	window now shared from bootup
const Window = new Pop.Opengl.Window("Lunar");

Window.OnRender = function(RenderTarget)
{
	try
	{
		//	update camera on render
		MoonApp.Camera.LookAt = Params.MoonSphere.slice();
		MoonApp.Camera.FovVertical = Params.Fov;
		Render( RenderTarget, MoonApp.Camera );
	}
	catch(e)
	{
		console.warn(e);
	}
}

MoveCamera = function(x,y,Button,FirstDown)
{
	const Camera = MoonApp.Camera;
	
	//if ( Button == 0 )
	//	this.Camera.OnCameraPan( x, 0, y, FirstDown );
	if ( Button == 0 )
		Camera.OnCameraOrbit( x, y, 0, FirstDown );
	if ( Button == 2 )
		Camera.OnCameraPanLocal( x, y, 0, FirstDown );
	if ( Button == 1 )
		Camera.OnCameraPanLocal( x, 0, y, FirstDown );
}

Window.OnMouseDown = function(x,y,Button)
{
	MoveCamera( x,y,Button,true );
}

Window.OnMouseMove = function(x,y,Button)
{
	MoveCamera( x,y,Button,false );
}

Window.OnMouseScroll = function(x,y,Button,Delta)
{
	let Fly = Delta[1] * 50;
	//Fly *= Params.ScrollFlySpeed;

	const Camera = MoonApp.Camera;
	Camera.OnCameraPanLocal( 0, 0, 0, true );
	Camera.OnCameraPanLocal( 0, 0, Fly, false );
}

function XrToMouseFunc(xyz,Button,Controller)
{
	const MouseFunc = this;
	const x = xyz[0] * Params.XrToMouseScale;
	const y = xyz[1] * Params.XrToMouseScale;
	return MouseFunc( x, y, Button );
}

//	setup xr mode
async function XrLoop(RenderContext)
{
	while(true)
	{
		function StartCallback(OnClicked)
		{
			function OnClick()
			{
				OnClicked();
				Button.SetStyle('visibility','hidden');
			}
			const Button = new Pop.Gui.Button('GotoXrButton');
			Button.SetStyle('visibility','visible');
			Button.OnClicked = OnClick;
		}
		
		const Device = await Pop.Xr.CreateDevice(RenderContext,StartCallback);
		Device.OnRender = Render;
		Device.OnMouseDown = XrToMouseFunc.bind(Window.OnMouseDown);
		Device.OnMouseMove = XrToMouseFunc.bind(Window.OnMouseMove);
		Device.OnMouseUp = XrToMouseFunc.bind(Window.OnMouseUp);
		await Device.WaitForEnd();
		Pop.Debug(`XR device ended`);
	}
}

function InitXr()
{
	if ( !Pop.Xr.IsSupported() )
		return;
	
	XrLoop(Window).catch(Pop.Debug);
}
InitXr();

