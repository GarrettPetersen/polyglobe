use std::{env, error::Error};

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() != 5 {
        return Err("Usage: dockside-pixel-fixer input.png output.png width height".into());
    }
    let cols: usize = args[3].parse()?;
    let rows: usize = args[4].parse()?;
    if cols == 0
        || rows == 0
        || cols
            .checked_mul(rows)
            .is_none_or(|pixels| pixels > 4_000_000)
    {
        return Err("Output must contain 1–4,000,000 pixels".into());
    }
    let source = image::open(&args[1])?.to_rgba8();
    let (width, height) = (source.width() as usize, source.height() as usize);
    let output = pixelfixer::reconstruct::reconstruct(
        source.as_raw(),
        width,
        height,
        width as f64 / cols as f64,
        height as f64 / rows as f64,
        cols,
        rows,
        false,
        false,
    );
    if output.cols != cols || output.rows != rows {
        return Err("Pixel Fixer changed the requested reconstruction dimensions".into());
    }
    image::save_buffer(
        &args[2],
        &output.rgba,
        cols as u32,
        rows as u32,
        image::ColorType::Rgba8,
    )?;
    Ok(())
}
