import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ProductCategory } from '@core/domain/entities/product.entity';
import { CloudinaryService } from '@shared/services/cloudinary.service';
import { Express } from 'express';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear nuevo producto',
    description: 'Crea un nuevo producto en el catálogo',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Producto creado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos del producto inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  // Crear producto con imágenes usando Cloudinary
  @UseGuards(AuthGuard('jwt'))
  @Post('with-images')
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT-auth')
  async createWithImages(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    try {
      console.log('Received data:', createProductDto);
      console.log('Received files:', files?.length || 0);

      // Validar datos requeridos
      if (
        !createProductDto.name ||
        !createProductDto.description ||
        !createProductDto.price ||
        !createProductDto.category ||
        createProductDto.stock === undefined
      ) {
        throw new BadRequestException(
          'Missing required fields: name, description, price, category, stock'
        );
      }

      // Validar archivos si existen
      if (files && files.length > 0) {
        this.validateFiles(files);
      }

      // Crear el producto primero
      const product = await this.productsService.create(createProductDto);

      // Si hay imágenes, subirlas a Cloudinary
      if (files && files.length > 0) {
        const uploadResults = await this.cloudinaryService.uploadMultipleImages(
          files,
          'products'
        );

        const imageUrls = uploadResults.map((result) => result.secure_url);
        const publicIds = uploadResults.map((result) => result.public_id);

        // Actualizar el producto con las URLs de Cloudinary
        const updatedProduct = await this.productsService.addImages(
          product._id.toString(),
          imageUrls,
          publicIds
        );

        return {
          message: 'Product created with images successfully',
          product: updatedProduct,
          imageUrls,
        };
      }

      return {
        message: 'Product created successfully',
        product,
      };
    } catch (error) {
      console.error('Error creating product with images:', error);
      throw new BadRequestException(
        error.message || 'Failed to create product'
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener productos',
    description: 'Obtiene una lista de productos con filtros opcionales',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Elementos por página',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ProductCategory,
    description: 'Filtrar por categoría',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Precio mínimo',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Precio máximo',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar por nombre o descripción',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de productos obtenida exitosamente',
  })
  findAll(@Query() filterDto: ProductFilterDto) {
    return this.productsService.findAll(filterDto);
  }

  @Get('featured')
  @ApiOperation({
    summary: 'Obtener productos destacados',
    description: 'Obtiene una lista de productos destacados',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Número máximo de productos',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Productos destacados obtenidos exitosamente',
  })
  findFeatured(@Query('limit') limit?: number) {
    return this.productsService.findFeatured(limit);
  }

  @Get('category/:category')
  @ApiOperation({
    summary: 'Obtener productos por categoría',
    description: 'Obtiene todos los productos de una categoría específica',
  })
  @ApiParam({
    name: 'category',
    enum: ProductCategory,
    description: 'Categoría del producto',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Productos de la categoría obtenidos exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Categoría inválida',
  })
  findByCategory(@Param('category') category: ProductCategory) {
    return this.productsService.findByCategory(category);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener producto por ID',
    description: 'Obtiene un producto específico por su ID',
  })
  @ApiParam({ name: 'id', description: 'ID del producto' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Producto obtenido exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Producto no encontrado',
  })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // Subir una sola imagen para un producto usando Cloudinary
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT-auth')
  async uploadProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Validar archivo
    this.validateFiles([file]);

    try {
      // Subir la imagen a Cloudinary
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        'products'
      );

      // Actualizar el producto agregando la nueva imagen
      const updatedProduct = await this.productsService.addImage(
        id,
        uploadResult.secure_url,
        uploadResult.public_id
      );

      return {
        message: 'Image uploaded successfully',
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        product: updatedProduct,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  // Subir múltiples imágenes para un producto usando Cloudinary
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/upload-images')
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT-auth')
  async uploadProductImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    // Validar archivos
    this.validateFiles(files);

    try {
      // Subir todas las imágenes a Cloudinary
      const uploadResults = await this.cloudinaryService.uploadMultipleImages(
        files,
        'products'
      );

      const imageUrls = uploadResults.map((result) => result.secure_url);
      const publicIds = uploadResults.map((result) => result.public_id);

      // Actualizar el producto agregando las nuevas imágenes
      const updatedProduct = await this.productsService.addImages(
        id,
        imageUrls,
        publicIds
      );

      return {
        message: `${imageUrls.length} images uploaded successfully`,
        imageUrls,
        publicIds,
        product: updatedProduct,
      };
    } catch (error) {
      console.error('Error uploading images:', error);
      throw new BadRequestException('Failed to upload images');
    }
  }

  // Eliminar una imagen específica de un producto de Cloudinary
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/images')
  @ApiBearerAuth('JWT-auth')
  async removeProductImage(
    @Param('id') id: string,
    @Body('publicId') publicId: string
  ) {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }

    try {
      // Eliminar la imagen del producto en la base de datos
      const updatedProduct = await this.productsService.removeImageByPublicId(
        id,
        publicId
      );

      // Eliminar la imagen de Cloudinary
      await this.cloudinaryService.deleteImage(publicId);

      return {
        message: 'Image removed successfully',
        product: updatedProduct,
      };
    } catch (error) {
      console.error('Error removing image:', error);
      throw new BadRequestException('Failed to remove image');
    }
  }

  private validateFiles(files: Express.Multer.File[]) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    const maxSize = 5 * 1024 * 1024; // 5MB

    files.forEach((file) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten: ${allowedMimeTypes.join(', ')}`
        );
      }

      if (file.size > maxSize) {
        throw new BadRequestException(
          `Archivo muy grande. Tamaño máximo permitido: 5MB`
        );
      }
    });
  }
}
