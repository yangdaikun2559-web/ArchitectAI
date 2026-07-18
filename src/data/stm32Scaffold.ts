import { FileEntry } from '../types';

export const stm32ScaffoldFiles: FileEntry[] = [
  {
    path: 'include/stm32f10x_conf.h',
    language: 'header',
    content: `#ifndef __STM32F10x_CONF_H
#define __STM32F10x_CONF_H

#include "stm32f10x_gpio.h"
#include "stm32f10x_rcc.h"
#include "stm32f10x_flash.h"
#include "misc.h"

#ifdef  USE_FULL_ASSERT
  #define assert_param(expr) ((expr) ? (void)0 : assert_failed((uint8_t *)__FILE__, __LINE__))
  void assert_failed(uint8_t* file, uint32_t line);
#else
  #define assert_param(expr) ((void)0)
#endif

#endif
`
  },
  {
    path: 'include/stm32f10x_it.h',
    language: 'header',
    content: `#ifndef __STM32F10x_IT_H
#define __STM32F10x_IT_H

#include "stm32f10x.h"

void NMI_Handler(void);
void HardFault_Handler(void);
void MemManage_Handler(void);
void BusFault_Handler(void);
void UsageFault_Handler(void);
void SVC_Handler(void);
void DebugMon_Handler(void);
void PendSV_Handler(void);
void SysTick_Handler(void);

#endif
`
  },
  {
    path: 'src/stm32f10x_it.c',
    language: 'c',
    content: `#include "stm32f10x_it.h"

void NMI_Handler(void) {}
void HardFault_Handler(void) { while (1) {} }
void MemManage_Handler(void) { while (1) {} }
void BusFault_Handler(void) { while (1) {} }
void UsageFault_Handler(void) { while (1) {} }
void SVC_Handler(void) {}
void DebugMon_Handler(void) {}
void PendSV_Handler(void) {}
void SysTick_Handler(void) {}
`
  },
  {
    path: 'include/delay.h',
    language: 'header',
    content: `#ifndef __DELAY_H
#define __DELAY_H

#include "stm32f10x.h"

void delay_init(void);
void delay_ms(uint16_t nms);
void delay_us(uint32_t nus);

#endif
`
  },
  {
    path: 'src/delay.c',
    language: 'c',
    content: `#include "delay.h"

static uint8_t  fac_us = 0;
static uint16_t fac_ms = 0;

void delay_init(void)
{
    SysTick_CLKSourceConfig(SysTick_CLKSource_HCLK_Div8);
    fac_us = SystemCoreClock / 8000000;
    fac_ms = (uint16_t)fac_us * 1000;
}

void delay_us(uint32_t nus)
{
    uint32_t temp;
    SysTick->LOAD = nus * fac_us;
    SysTick->VAL = 0x00;
    SysTick->CTRL |= SysTick_CTRL_ENABLE_Msk;
    do
    {
        temp = SysTick->CTRL;
    } while ((temp & 0x01) && !(temp & (1 << 16)));
    SysTick->CTRL &= ~SysTick_CTRL_ENABLE_Msk;
    SysTick->VAL = 0x00;
}

void delay_ms(uint16_t nms)
{
    uint32_t temp;
    SysTick->LOAD = (uint32_t)nms * fac_ms;
    SysTick->VAL = 0x00;
    SysTick->CTRL |= SysTick_CTRL_ENABLE_Msk;
    do
    {
        temp = SysTick->CTRL;
    } while ((temp & 0x01) && !(temp & (1 << 16)));
    SysTick->CTRL &= ~SysTick_CTRL_ENABLE_Msk;
    SysTick->VAL = 0x00;
}
`
  },
  {
    path: 'include/dht.h',
    language: 'header',
    content: `#ifndef __DHT_H
#define __DHT_H

#include "stm32f10x.h"

// Defined in pins.h
// E.g. #define DHT_PIN GPIO_Pin_0
//      #define DHT_GPIO_PORT GPIOB
//      #define DHT_GPIO_CLK RCC_APB2Periph_GPIOB

uint8_t DHT_ReadData(float *temp, float *humi);

#endif
`
  },
  {
    path: 'src/dht.c',
    language: 'c',
    content: `#include "dht.h"
#include "delay.h"
#include "pins.h"

static void DHT_SetOutput(void)
{
    GPIO_InitTypeDef GPIO_InitStructure;
    GPIO_InitStructure.GPIO_Pin = DHT_PIN;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    GPIO_Init(DHT_GPIO_PORT, &GPIO_InitStructure);
}

static void DHT_SetInput(void)
{
    GPIO_InitTypeDef GPIO_InitStructure;
    GPIO_InitStructure.GPIO_Pin = DHT_PIN;
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN_FLOATING;
    GPIO_Init(DHT_GPIO_PORT, &GPIO_InitStructure);
}

static uint8_t DHT_ReadByte(void)
{
    uint8_t i, data = 0;
    for (i = 0; i < 8; i++)
    {
        while (GPIO_ReadInputDataBit(DHT_GPIO_PORT, DHT_PIN) == RESET);
        delay_us(40);
        if (GPIO_ReadInputDataBit(DHT_GPIO_PORT, DHT_PIN) == SET)
        {
            data |= (1 << (7 - i));
        }
        while (GPIO_ReadInputDataBit(DHT_GPIO_PORT, DHT_PIN) == SET);
    }
    return data;
}

uint8_t DHT_ReadData(float *temp, float *humi)
{
    uint8_t buf[5];
    uint8_t i;

    // Enable GPIO clock dynamically
    RCC_APB2PeriphClockCmd(DHT_GPIO_CLK, ENABLE);

    DHT_SetOutput();
    GPIO_ResetBits(DHT_GPIO_PORT, DHT_PIN);
    delay_ms(18);
    GPIO_SetBits(DHT_GPIO_PORT, DHT_PIN);
    delay_us(30);
    DHT_SetInput();
    
    // DHT response wait
    delay_us(40);
    if (GPIO_ReadInputDataBit(DHT_GPIO_PORT, DHT_PIN) == RESET)
    {
        while (GPIO_ReadInputDataBit(DHT_GPIO_PORT, DHT_PIN) == RESET);
        while (GPIO_ReadInputDataBit(DHT_GPIO_PORT, DHT_PIN) == SET);
        for (i = 0; i < 5; i++)
        {
            buf[i] = DHT_ReadByte();
        }
        if ((buf[0] + buf[1] + buf[2] + buf[3]) == buf[4])
        {
            // DHT22 uses 16-bit decimal formatting; DHT11 uses separate bytes
            // We implement robust auto-checking for DHT22 vs DHT11 ranges
            if (buf[0] == 0 && buf[2] == 0 && (buf[1] != 0 || buf[3] != 0)) {
                // Typical DHT22 reading where MSB is 0
                *humi = (float)((buf[0] << 8) | buf[1]) / 10.0f;
                *temp = (float)((buf[2] << 8) | buf[3]) / 10.0f;
            } else {
                // Fallback to DHT11 conversion
                *humi = (float)buf[0] + (float)buf[1] / 10.0f;
                *temp = (float)buf[2] + (float)buf[3] / 10.0f;
            }
            return 1;
        }
    }
    return 0;
}
`
  },
  {
    path: 'include/oled.h',
    language: 'header',
    content: `#ifndef __OLED_H
#define __OLED_H

#include "stm32f10x.h"

// OLED address
#define OLED_ADDR       0x78 // 0x3C << 1

void OLED_Init(void);
void OLED_Clear(void);
void OLED_ShowChar(uint8_t x, uint8_t y, char chr);
void OLED_ShowString(uint8_t x, uint8_t y, const char *str);
void OLED_ShowNum(uint8_t x, uint8_t y, uint32_t num, uint8_t len);

#endif
`
  },
  {
    path: 'src/oled.c',
    language: 'c',
    content: `#include "oled.h"
#include "delay.h"
#include "pins.h"

static void I2C_Start(void)
{
    GPIO_SetBits(OLED_SDA_PORT, OLED_SDA_PIN);
    GPIO_SetBits(OLED_SCL_PORT, OLED_SCL_PIN);
    delay_us(4);
    GPIO_ResetBits(OLED_SDA_PORT, OLED_SDA_PIN);
    delay_us(4);
    GPIO_ResetBits(OLED_SCL_PORT, OLED_SCL_PIN);
}

static void I2C_Stop(void)
{
    GPIO_ResetBits(OLED_SDA_PORT, OLED_SDA_PIN);
    delay_us(4);
    GPIO_SetBits(OLED_SCL_PORT, OLED_SCL_PIN);
    delay_us(4);
    GPIO_SetBits(OLED_SDA_PORT, OLED_SDA_PIN);
    delay_us(4);
}

static void I2C_SendByte(uint8_t byte)
{
    uint8_t i;
    for (i = 0; i < 8; i++)
    {
        if (byte & 0x80)
            GPIO_SetBits(OLED_SDA_PORT, OLED_SDA_PIN);
        else
            GPIO_ResetBits(OLED_SDA_PORT, OLED_SDA_PIN);
        byte <<= 1;
        GPIO_SetBits(OLED_SCL_PORT, OLED_SCL_PIN);
        delay_us(2);
        GPIO_ResetBits(OLED_SCL_PORT, OLED_SCL_PIN);
        delay_us(2);
    }
    // Pull high to release the SDA line for ACK
    GPIO_SetBits(OLED_SDA_PORT, OLED_SDA_PIN);
    GPIO_SetBits(OLED_SCL_PORT, OLED_SCL_PIN);
    delay_us(2);
    GPIO_ResetBits(OLED_SCL_PORT, OLED_SCL_PIN);
}

static void OLED_WriteCmd(uint8_t cmd)
{
    I2C_Start();
    I2C_SendByte(OLED_ADDR);
    I2C_SendByte(0x00);
    I2C_SendByte(cmd);
    I2C_Stop();
}

static void OLED_WriteData(uint8_t data)
{
    I2C_Start();
    I2C_SendByte(OLED_ADDR);
    I2C_SendByte(0x40);
    I2C_SendByte(data);
    I2C_Stop();
}

void OLED_Init(void)
{
    GPIO_InitTypeDef GPIO_InitStructure;
    
    // Enable GPIO clocks for both OLED ports
    RCC_APB2PeriphClockCmd(OLED_SCL_CLK | OLED_SDA_CLK, ENABLE);
    
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_OD;
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
    
    GPIO_InitStructure.GPIO_Pin = OLED_SCL_PIN;
    GPIO_Init(OLED_SCL_PORT, &GPIO_InitStructure);
    
    GPIO_InitStructure.GPIO_Pin = OLED_SDA_PIN;
    GPIO_Init(OLED_SDA_PORT, &GPIO_InitStructure);
    
    GPIO_SetBits(OLED_SCL_PORT, OLED_SCL_PIN);
    GPIO_SetBits(OLED_SDA_PORT, OLED_SDA_PIN);

    delay_ms(100);
    OLED_WriteCmd(0xAE); // Display Off
    OLED_WriteCmd(0x00); // Set low column address
    OLED_WriteCmd(0x10); // Set high column address
    OLED_WriteCmd(0x40); // Set start line address
    OLED_WriteCmd(0x81); // Set contrast control register
    OLED_WriteCmd(0xCF);
    OLED_WriteCmd(0xA1); // Set segment re-map (mirror horizontally)
    OLED_WriteCmd(0xC8); // Set COM scan direction (mirror vertically)
    OLED_WriteCmd(0xA6); // Set normal display
    OLED_WriteCmd(0xA8); // Set multiplex ratio (64)
    OLED_WriteCmd(0x3F);
    OLED_WriteCmd(0xD3); // Set display offset (0)
    OLED_WriteCmd(0x00);
    OLED_WriteCmd(0xD5); // Set display clock divide ratio/oscillator frequency
    OLED_WriteCmd(0x80);
    OLED_WriteCmd(0xD9); // Set pre-charge period
    OLED_WriteCmd(0xF1);
    OLED_WriteCmd(0xDA); // Set COM pins hardware configuration
    OLED_WriteCmd(0x12);
    OLED_WriteCmd(0xDB); // Set VCOMH deselect level
    OLED_WriteCmd(0x40);
    OLED_WriteCmd(0x8D); // Charge pump settings
    OLED_WriteCmd(0x14); // Enable charge pump
    OLED_WriteCmd(0xAF); // Display On
    OLED_Clear();
}

void OLED_Clear(void)
{
    uint8_t i, j;
    for (i = 0; i < 8; i++)
    {
        OLED_WriteCmd(0xB0 + i); // Set page address
        OLED_WriteCmd(0x00);     // Set lower column start address
        OLED_WriteCmd(0x10);     // Set higher column start address
        for (j = 0; j < 128; j++)
        {
            OLED_WriteData(0x00);
        }
    }
}

// Complete 6x8 ASCII Font table
static const uint8_t FONT_6x8[][6] = {
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, // space (0x20)
    {0x00, 0x00, 0x00, 0x2f, 0x00, 0x00}, // !
    {0x00, 0x00, 0x07, 0x00, 0x07, 0x00}, // "
    {0x00, 0x14, 0x7f, 0x14, 0x7f, 0x14}, // #
    {0x00, 0x24, 0x2a, 0x7f, 0x2a, 0x12}, // $
    {0x00, 0x62, 0x64, 0x08, 0x13, 0x23}, // %
    {0x00, 0x36, 0x49, 0x55, 0x22, 0x50}, // &
    {0x00, 0x00, 0x05, 0x03, 0x00, 0x00}, // '
    {0x00, 0x00, 0x1c, 0x22, 0x41, 0x00}, // (
    {0x00, 0x00, 0x41, 0x22, 0x1c, 0x00}, // )
    {0x00, 0x14, 0x08, 0x3e, 0x08, 0x14}, // *
    {0x00, 0x08, 0x08, 0x3e, 0x08, 0x08}, // +
    {0x00, 0x00, 0x00, 0xa0, 0x60, 0x00}, // ,
    {0x00, 0x08, 0x08, 0x08, 0x08, 0x08}, // -
    {0x00, 0x00, 0x60, 0x60, 0x00, 0x00}, // .
    {0x00, 0x20, 0x10, 0x08, 0x04, 0x02}, // /
    {0x00, 0x3e, 0x51, 0x49, 0x45, 0x3e}, // 0
    {0x00, 0x00, 0x42, 0x7f, 0x40, 0x00}, // 1
    {0x00, 0x42, 0x61, 0x51, 0x49, 0x46}, // 2
    {0x00, 0x21, 0x41, 0x45, 0x4b, 0x31}, // 3
    {0x00, 0x18, 0x14, 0x12, 0x7f, 0x10}, // 4
    {0x00, 0x27, 0x45, 0x45, 0x45, 0x39}, // 5
    {0x00, 0x3c, 0x4a, 0x49, 0x49, 0x30}, // 6
    {0x00, 0x01, 0x71, 0x09, 0x05, 0x03}, // 7
    {0x00, 0x36, 0x49, 0x49, 0x49, 0x36}, // 8
    {0x00, 0x06, 0x49, 0x49, 0x29, 0x1e}, // 9
    {0x00, 0x00, 0x36, 0x36, 0x00, 0x00}, // :
    {0x00, 0x00, 0x56, 0x36, 0x00, 0x00}, // ;
    {0x00, 0x08, 0x14, 0x22, 0x41, 0x00}, // <
    {0x00, 0x14, 0x14, 0x14, 0x14, 0x14}, // =
    {0x00, 0x00, 0x41, 0x22, 0x14, 0x08}, // >
    {0x00, 0x02, 0x01, 0x51, 0x09, 0x06}, // ?
    {0x00, 0x32, 0x49, 0x59, 0x51, 0x3e}, // @
    {0x00, 0x7c, 0x12, 0x11, 0x12, 0x7c}, // A
    {0x00, 0x7f, 0x49, 0x49, 0x49, 0x36}, // B
    {0x00, 0x3e, 0x41, 0x41, 0x41, 0x22}, // C
    {0x00, 0x7f, 0x41, 0x41, 0x22, 0x1c}, // D
    {0x00, 0x7f, 0x49, 0x49, 0x49, 0x41}, // E
    {0x00, 0x7f, 0x09, 0x09, 0x09, 0x01}, // F
    {0x00, 0x3e, 0x41, 0x49, 0x49, 0x7a}, // G
    {0x00, 0x7f, 0x08, 0x08, 0x08, 0x7f}, // H
    {0x00, 0x00, 0x41, 0x7f, 0x41, 0x00}, // I
    {0x00, 0x20, 0x40, 0x41, 0x3f, 0x01}, // J
    {0x00, 0x7f, 0x08, 0x14, 0x22, 0x41}, // K
    {0x00, 0x7f, 0x40, 0x40, 0x40, 0x40}, // L
    {0x00, 0x7f, 0x02, 0x0c, 0x02, 0x7f}, // M
    {0x00, 0x7f, 0x04, 0x08, 0x10, 0x7f}, // N
    {0x00, 0x3e, 0x41, 0x41, 0x41, 0x3e}, // O
    {0x00, 0x7f, 0x09, 0x09, 0x09, 0x06}, // P
    {0x00, 0x3e, 0x41, 0x51, 0x21, 0x5e}, // Q
    {0x00, 0x7f, 0x09, 0x19, 0x29, 0x46}, // R
    {0x00, 0x46, 0x49, 0x49, 0x49, 0x31}, // S
    {0x00, 0x01, 0x01, 0x7f, 0x01, 0x01}, // T
    {0x00, 0x3f, 0x40, 0x40, 0x40, 0x3f}, // U
    {0x00, 0x1f, 0x20, 0x40, 0x20, 0x1f}, // V
    {0x00, 0x3f, 0x40, 0x38, 0x40, 0x3f}, // W
    {0x00, 0x63, 0x14, 0x08, 0x14, 0x63}, // X
    {0x00, 0x07, 0x08, 0x70, 0x08, 0x07}, // Y
    {0x00, 0x61, 0x51, 0x49, 0x45, 0x43}, // Z
    {0x00, 0x00, 0x7f, 0x41, 0x41, 0x00}, // [
    {0x00, 0x02, 0x04, 0x08, 0x16, 0x20}, // backslash
    {0x00, 0x00, 0x41, 0x41, 0x7f, 0x00}, // ]
    {0x00, 0x04, 0x02, 0x01, 0x02, 0x04}, // ^
    {0x00, 0x40, 0x40, 0x40, 0x40, 0x40}, // _
    {0x00, 0x00, 0x01, 0x02, 0x04, 0x00}, // backtick
    {0x00, 0x20, 0x54, 0x54, 0x54, 0x78}, // a
    {0x00, 0x7f, 0x48, 0x44, 0x44, 0x38}, // b
    {0x00, 0x38, 0x44, 0x44, 0x44, 0x20}, // c
    {0x00, 0x38, 0x44, 0x44, 0x48, 0x7f}, // d
    {0x00, 0x38, 0x54, 0x54, 0x54, 0x18}, // e
    {0x00, 0x08, 0x7e, 0x09, 0x01, 0x02}, // f
    {0x00, 0x0c, 0x52, 0x52, 0x52, 0x3e}, // g
    {0x00, 0x7f, 0x08, 0x04, 0x04, 0x78}, // h
    {0x00, 0x00, 0x44, 0x7d, 0x40, 0x00}, // i
    {0x00, 0x20, 0x40, 0x44, 0x3d, 0x00}, // j
    {0x00, 0x7f, 0x10, 0x28, 0x44, 0x00}, // k
    {0x00, 0x00, 0x41, 0x7f, 0x40, 0x00}, // l
    {0x00, 0x7c, 0x04, 0x18, 0x04, 0x78}, // m
    {0x00, 0x7c, 0x08, 0x04, 0x04, 0x78}, // n
    {0x00, 0x38, 0x44, 0x44, 0x44, 0x38}, // o
    {0x00, 0x7c, 0x14, 0x14, 0x14, 0x08}, // p
    {0x00, 0x08, 0x14, 0x14, 0x18, 0x7c}, // q
    {0x00, 0x7c, 0x08, 0x04, 0x04, 0x08}, // r
    {0x00, 0x48, 0x54, 0x54, 0x54, 0x20}, // s
    {0x00, 0x04, 0x3f, 0x44, 0x40, 0x20}, // t
    {0x00, 0x3c, 0x40, 0x40, 0x20, 0x7c}, // u
    {0x00, 0x1c, 0x20, 0x40, 0x20, 0x1c}, // v
    {0x00, 0x3c, 0x40, 0x30, 0x40, 0x3c}, // w
    {0x00, 0x44, 0x28, 0x10, 0x28, 0x44}, // x
    {0x00, 0x0c, 0x50, 0x50, 0x50, 0x3c}, // y
    {0x00, 0x44, 0x64, 0x54, 0x4c, 0x44}, // z
    {0x00, 0x08, 0x36, 0x41, 0x00, 0x00}, // {
    {0x00, 0x00, 0x00, 0x7f, 0x00, 0x00}, // |
    {0x00, 0x00, 0x00, 0x41, 0x36, 0x08}, // }
    {0x00, 0x08, 0x08, 0x18, 0x08, 0x10}  // ~
};

void OLED_ShowChar(uint8_t x, uint8_t y, char chr)
{
    uint8_t c = chr - ' ';
    if (x > 122 || y > 7) return;
    OLED_WriteCmd(0xB0 + y);
    OLED_WriteCmd(((x & 0xF0) >> 4) | 0x10);
    OLED_WriteCmd(x & 0x0F);
    for (uint8_t i = 0; i < 6; i++)
    {
        OLED_WriteData(FONT_6x8[c][i]);
    }
}

void OLED_ShowString(uint8_t x, uint8_t y, const char *str)
{
    while (*str)
    {
        OLED_ShowChar(x, y, *str);
        x += 6;
        if (x > 122)
        {
            x = 0;
            y++;
        }
        str++;
    }
}

static uint32_t ipow(uint8_t m, uint8_t n)
{
    uint32_t result = 1;
    while (n--) result *= m;
    return result;
}

void OLED_ShowNum(uint8_t x, uint8_t y, uint32_t num, uint8_t len)
{
    uint8_t t, temp;
    uint8_t enshow = 0;
    for (t = 0; t < len; t++)
    {
        temp = (num / ipow(10, len - t - 1)) % 10;
        if (enshow == 0 && t < (len - 1))
        {
            if (temp == 0)
            {
                OLED_ShowChar(x + 6 * t, y, ' ');
                continue;
            }
            else enshow = 1;
        }
        OLED_ShowChar(x + 6 * t, y, temp + '0');
    }
}
`
  }
];
